import * as path from 'path';

import * as A from './ast';
import { FollowState, moduleNameToFile } from './resolver';
import { PROP_RUN_FNS, synthesizePropRunActions, type ExtractedNode } from './synthesize';
import type { ModuleCache, ParsedModule } from './parser';

const GROUP_FNS = new Set(['testGroup']);
const TEST_FNS = new Set([
  'testCase',
  'testProperty',
  'testCaseSteps',
  'testCaseInfo',
  'goldenVsFile',
  'goldenVsString',
]);

const DEFAULT_MAIN_FNS = new Set([
  'defaultMain',
  'defaultMainStreaming',
  'defaultMainStreamingWithIngredients',
  'defaultMainTestingInterface',
  'defaultMainWithIngredients',
]);

const TRANSPARENT_WRAPPERS = new Set([
  'askOption',
  'localOption',
  'adjustOption',
  'withCoverageIndices',
  'withResource',
  'after',
  'sequentialTestGroup',
  'expectFail',
  'expectFailBecause',
  'ignoreTest',
  'ignoreTestBecause',
]);

function isTastyFn(name: string): boolean {
  return GROUP_FNS.has(name) || TEST_FNS.has(name);
}

function isDefaultMainFn(name: string): boolean {
  return DEFAULT_MAIN_FNS.has(name);
}

function isTransparentWrapperFn(name: string): boolean {
  return TRANSPARENT_WRAPPERS.has(name);
}

export class ExtractContext {
  public readonly root: string;
  public readonly moduleCache: ModuleCache;
  public readonly baseDirs: Array<string>;
  public readonly follow: FollowState;

  constructor(options: { root: string; moduleCache: ModuleCache; baseDirs: Array<string>; follow: FollowState }) {
    this.root = options.root;
    this.moduleCache = options.moduleCache;
    this.baseDirs = options.baseDirs;
    this.follow = options.follow;
  }

  public rel(filePath: string): string {
    return path.relative(this.root, filePath);
  }
}

function dynamicPlaceholder(label: string, note: string): ExtractedNode {
  return {
    kind: 'placeholder',
    label,
    source: 'dynamic',
    pendingExpansion: true,
    note,
  };
}

function resolveModuleFile(
  moduleReference: string,
  contextModule: ParsedModule,
  context: ExtractContext
): { file: string; module: ParsedModule } | null {
  const resolved = contextModule.imports.resolveModule(moduleReference);
  const filePath = moduleNameToFile(resolved ?? moduleReference, context.baseDirs);
  if (filePath === null) {
    return null;
  }

  return {
    file: filePath,
    module: context.moduleCache.parse(filePath),
  };
}

function buildTastyNode(
  applyNode: A.NodeLike,
  functionName: string,
  args: Array<A.NodeLike>,
  contextModule: ParsedModule,
  context: ExtractContext
): ExtractedNode {
  let label: string | null = null;

  for (const arg of args) {
    const literal = A.stringLiteralText(arg);
    if (literal !== null) {
      label = literal;
      break;
    }
  }

  const kind: ExtractedNode['kind'] = GROUP_FNS.has(functionName) ? 'group' : 'test';

  const node: ExtractedNode = {
    kind,
    label,
    source: 'parsed',
    file: context.rel(contextModule.file),
    line: A.lineOf(applyNode),
  };

  if (label === null) {
    node.note = 'non-literal label; not statically determinable';
  }

  if (kind === 'group') {
    node.children = [];
    const listArg = A.findListArg(args);
    if (listArg !== null) {
      for (const element of A.listElements(listArg)) {
        node.children.push(...extractExpr(element, contextModule, context));
      }
    } else {
      node.children.push(
        dynamicPlaceholder(
          label ?? 'group children',
          'group children are not a literal list; not statically enumerable'
        )
      );
    }
  }

  return node;
}

function resolveReference(
  node: A.NodeLike,
  contextModule: ParsedModule,
  context: ExtractContext,
  options: { quiet?: boolean }
): { resolved: boolean; nodes: Array<ExtractedNode> } {
  const target = A.refTarget(node);
  const label = node.text.trim();

  if (target === null) {
    return {
      resolved: false,
      nodes: [dynamicPlaceholder(label, 'could not interpret as a reference')],
    };
  }

  let targetModule = contextModule;
  let crossFile = false;

  if (target.module !== null) {
    const resolvedModule = resolveModuleFile(target.module, contextModule, context);
    if (resolvedModule === null) {
      return {
        resolved: false,
        nodes: [
          dynamicPlaceholder(
            label,
            `unresolved reference: module ${target.module} not found under base dirs`
          ),
        ],
      };
    }

    targetModule = resolvedModule.module;
    crossFile = targetModule.file !== contextModule.file;
  }

  let bindingNode = targetModule.binds.get(target.name) ?? null;

  if (bindingNode === null && target.module === null) {
    for (const moduleName of contextModule.imports.candidateModulesFor(target.name)) {
      const resolvedModule = resolveModuleFile(moduleName, contextModule, context);
      if (resolvedModule === null) {
        continue;
      }

      const candidateBinding = resolvedModule.module.binds.get(target.name) ?? null;
      if (candidateBinding !== null) {
        targetModule = resolvedModule.module;
        crossFile = targetModule.file !== contextModule.file;
        bindingNode = candidateBinding;
        break;
      }
    }
  }

  if (bindingNode === null) {
    return {
      resolved: false,
      nodes: [
        dynamicPlaceholder(
          label,
          `unresolved reference: binding '${target.name}'${
            target.module !== null ? ` in module ${target.module}` : ' in current module or imports'
          } not found`
        ),
      ],
    };
  }

  if (context.follow.seen(targetModule.file, target.name)) {
    return {
      resolved: true,
      nodes: [dynamicPlaceholder(label, 'cyclic reference; following stopped')],
    };
  }

  if (crossFile) {
    if (!context.follow.hasBudget()) {
      return {
        resolved: false,
        nodes: [
          dynamicPlaceholder(
            label,
            `reference not followed (cross-file follow limit ${context.follow.limit} reached)`
          ),
        ],
      };
    }
    context.follow.spend();
  }

  const expression = A.bindExpression(bindingNode);
  if (expression === null) {
    return {
      resolved: false,
      nodes: [
        dynamicPlaceholder(
          label,
          `binding '${target.name}' resolved but has no simple RHS expression`
        ),
      ],
    };
  }

  context.follow.mark(targetModule.file, target.name);
  const nodes = extractExpr(expression, targetModule, context);
  return { resolved: true, nodes };
}

export function extractExpr(
  expression: A.NodeLike | null,
  contextModule: ParsedModule,
  context: ExtractContext
): Array<ExtractedNode> {
  if (expression === null) {
    return [];
  }

  switch (expression.type) {
    case 'parens':
      return extractExpr(expression.childForFieldName('expression'), contextModule, context);

    case 'let_in':
      return extractExpr(expression.childForFieldName('expression'), contextModule, context);

    case 'lambda': {
      let body: A.NodeLike | null = null;
      for (const child of expression.namedChildren) {
        if (child.type !== 'patterns') {
          body = child;
        }
      }
      return extractExpr(body, contextModule, context);
    }

    case 'infix': {
      const operator = expression.childForFieldName('operator');
      const leftOperand = expression.childForFieldName('left_operand');
      const rightOperand = expression.childForFieldName('right_operand');

      if (operator !== null && operator.text.trim() === '$' && leftOperand !== null && rightOperand !== null) {
        const { head, args } = A.peelApply(leftOperand);
        const functionName = A.headVariableName(head);
        const allArgs = [...args, rightOperand];

        if (functionName !== null && PROP_RUN_FNS.has(functionName)) {
          return [
            synthesizePropRunActions(
              expression,
              allArgs,
              contextModule,
              {
                rel: (filePath: string) => context.rel(filePath),
                resolveModuleFile: (moduleName: string) =>
                  resolveModuleFile(moduleName, contextModule, context),
              },
              functionName
            ),
          ];
        }

        if (functionName !== null && isTastyFn(functionName)) {
          return [buildTastyNode(expression, functionName, allArgs, contextModule, context)];
        }

        if (
          functionName !== null
          && (isDefaultMainFn(functionName) || isTransparentWrapperFn(functionName))
        ) {
          return extractExpr(rightOperand, contextModule, context);
        }

        const resolvedReference = resolveReference(leftOperand, contextModule, context, { quiet: true });
        if (resolvedReference.resolved) {
          return resolvedReference.nodes;
        }

        return extractExpr(rightOperand, contextModule, context);
      }

      const nodes: Array<ExtractedNode> = [];
      if (leftOperand !== null) {
        nodes.push(...extractExpr(leftOperand, contextModule, context));
      }
      if (rightOperand !== null) {
        nodes.push(...extractExpr(rightOperand, contextModule, context));
      }
      return nodes;
    }

    case 'apply': {
      const { head, args } = A.peelApply(expression);
      const functionName = A.headVariableName(head);

      if (functionName !== null && PROP_RUN_FNS.has(functionName)) {
        return [
          synthesizePropRunActions(
            expression,
            args,
            contextModule,
            {
              rel: (filePath: string) => context.rel(filePath),
              resolveModuleFile: (moduleName: string) =>
                resolveModuleFile(moduleName, contextModule, context),
            },
            functionName
          ),
        ];
      }

      if (functionName !== null && isTastyFn(functionName)) {
        return [buildTastyNode(expression, functionName, args, contextModule, context)];
      }

      if (functionName !== null && isDefaultMainFn(functionName)) {
        const nodes: Array<ExtractedNode> = [];
        for (const arg of args) {
          nodes.push(...extractExpr(arg, contextModule, context));
        }
        return nodes;
      }

      if (functionName !== null && isTransparentWrapperFn(functionName)) {
        if (args.length === 0) {
          return [];
        }
        return extractExpr(args[args.length - 1], contextModule, context);
      }

      const resolvedReference = resolveReference(expression, contextModule, context, { quiet: true });
      if (resolvedReference.resolved) {
        return resolvedReference.nodes;
      }

      const nodes: Array<ExtractedNode> = [];
      for (const arg of args) {
        nodes.push(...extractExpr(arg, contextModule, context));
      }

      if (nodes.length > 0) {
        return nodes;
      }

      return resolvedReference.nodes;
    }

    case 'variable':
    case 'qualified': {
      const referenceName = A.headVariableName(expression);
      if (
        referenceName !== null
        && (isDefaultMainFn(referenceName) || isTransparentWrapperFn(referenceName))
      ) {
        return [];
      }
      return resolveReference(expression, contextModule, context, {}).nodes;
    }

    case 'list': {
      const nodes: Array<ExtractedNode> = [];
      for (const element of A.listElements(expression)) {
        nodes.push(...extractExpr(element, contextModule, context));
      }
      return nodes;
    }

    default:
      return [];
  }
}

function findEntryExpression(module: ParsedModule): { expr: A.NodeLike; from: string } | null {
  if (module.binds.has('main')) {
    const expression = A.bindExpression(module.binds.get('main') ?? null);
    if (expression !== null) {
      return { expr: expression, from: 'main' };
    }
  }

  if (module.binds.has('tests')) {
    const expression = A.bindExpression(module.binds.get('tests') ?? null);
    if (expression !== null) {
      return { expr: expression, from: 'tests' };
    }
  }

  for (const [name, bindingNode] of module.binds.entries()) {
    const expression = A.bindExpression(bindingNode);
    if (expression === null) {
      continue;
    }

    if (expression.type === 'apply') {
      const { head } = A.peelApply(expression);
      const functionName = A.headVariableName(head);
      if (functionName !== null && GROUP_FNS.has(functionName)) {
        return { expr: expression, from: name };
      }
    }

    if (expression.type === 'infix') {
      const rightOperand = expression.childForFieldName('right_operand');
      if (rightOperand !== null && rightOperand.type === 'apply') {
        const { head } = A.peelApply(rightOperand);
        const functionName = A.headVariableName(head);
        if (functionName !== null && GROUP_FNS.has(functionName)) {
          return { expr: expression, from: name };
        }
      }
    }
  }

  return null;
}

export function extractTree(
  entryModule: ParsedModule,
  context: ExtractContext
): { tree: ExtractedNode | Array<ExtractedNode> | null; entryBinding: string | null } {
  const entry = findEntryExpression(entryModule);
  if (entry === null) {
    return { tree: null, entryBinding: null };
  }

  context.follow.mark(entryModule.file, entry.from);
  const nodes = extractExpr(entry.expr, entryModule, context);

  if (nodes.length === 0) {
    return { tree: null, entryBinding: entry.from };
  }

  if (nodes.length === 1) {
    return { tree: nodes[0], entryBinding: entry.from };
  }

  return { tree: nodes, entryBinding: entry.from };
}
