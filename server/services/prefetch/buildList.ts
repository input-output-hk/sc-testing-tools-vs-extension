import * as path from 'path';

import {
  ParsedCabalPackage,
  ParsedSuiteDefinition,
} from './discover';

import { getParser, ModuleCache } from './static/parser';
import { extractSuite, type ExtractedSuite } from './static/suites';
import type { ExtractedNode } from './static/synthesize';

export async function buildWorkspacePackages(
  workspace: Workspace,
  discoveredPackages: Array<ParsedCabalPackage>,
): Promise<StaticTestTree['packages']> {
  const parser = await getParser();
  const moduleCache = new ModuleCache(parser);
  const packageMap: StaticTestTree['packages'] = {};

  for (const discoveredPackage of discoveredPackages) {
    const packageId = `${workspace.id}:${discoveredPackage.name}`;

    if (!hasOwnKey(packageMap, packageId)) {
      packageMap[packageId] = {
        id: [workspace.id, discoveredPackage.name],
        name: discoveredPackage.name,
        packagePath: discoveredPackage.packagePath,
        workspace,
        isOpen: true,
        suites: {},
      };
    }

    const packageNode = packageMap[packageId]!;
    for (const suiteDefinition of discoveredPackage.suites) {
      const suite = buildSuite(
        workspace,
        discoveredPackage,
        suiteDefinition,
        moduleCache,
      );

      if (suite && !hasOwnKey(packageNode.suites, suite.name)) {
        packageNode.suites[suite.name] = suite;
      }
    }
  }

  return packageMap;
}

function buildSuite(
  workspace: Workspace,
  discoveredPackage: ParsedCabalPackage,
  suiteDefinition: ParsedSuiteDefinition,
  moduleCache: ModuleCache,
): StaticTestSuite | null {
  if (suiteDefinition.entryPoint === 'MISSING' || suiteDefinition.entryPoint === 'unknown') {
    return null;
  }

  let extractedSuite: ExtractedSuite;
  try {
    extractedSuite = extractSuite(
      {
        suite: suiteDefinition.name,
        packageDir: discoveredPackage.packageDir,
        mainIs: suiteDefinition.mainIs,
        hsSourceDirs: suiteDefinition.hsSourceDirs,
        entryPoint: suiteDefinition.entryPoint,
      },
      workspace.path,
      moduleCache,
    );
  } catch (error) {
    console.error(
      `Skipping suite after extraction failure: ${discoveredPackage.name}/${suiteDefinition.name}`,
      error,
    );
    return null;
  }

  return {
    id: [
      workspace.id,
      discoveredPackage.name,
      suiteDefinition.name
    ],
    name: suiteDefinition.name,
    status: 'undetermined',
    isWaiting: false,
    isRunning: false,
    isStatic: true,
    isOpen: false,
    tests: buildStaticTestList(
      workspace,
      discoveredPackage.name,
      discoveredPackage.packagePath,
      suiteDefinition.name,
      extractedSuite,
    ),
  };
}

function buildStaticTestList(
  workspace: Workspace,
  packageName: string,
  packagePath: string,
  suiteName: string,
  extractedSuite: ExtractedSuite,
): GenericMap<Test> {
  const tests: GenericMap<Test> = {};
  const idState = { counter: 0 };

  for (const node of toNodeArray(extractedSuite.tree)) {
    collectTests({
      node,
      tests,
      parentGroups: [],
      idState,
      workspace,
      packageName,
      packagePath,
      suiteName,
      fallbackEntryFile: extractedSuite.entryFile,
    });
  }

  return tests;
}

function toNodeArray(tree: ExtractedSuite['tree']): Array<ExtractedNode> {
  if (tree === null) {
    return [];
  }
  return Array.isArray(tree) ? tree : [tree];
}

function collectTests(options: {
  node: ExtractedNode;
  tests: GenericMap<Test>;
  parentGroups: Array<string>;
  idState: { counter: number };
  workspace: Workspace;
  packageName: string;
  packagePath: string;
  suiteName: string;
  fallbackEntryFile: string | null;
}): void {
  const {
    node,
    tests,
    parentGroups,
    idState,
    workspace,
    packageName,
    packagePath,
    suiteName,
    fallbackEntryFile,
  } = options;

  if (node.kind === 'group') {
    const groupName = normalizeNodeLabel(node.label, node.kind);
    for (const child of node.children ?? []) {
      collectTests({
        ...options,
        node: child,
        parentGroups: [...parentGroups, groupName],
      });
    }
    return;
  }

  idState.counter += 1;
  const testKey = `${workspace.id}:${packageName}:${suiteName}:${idState.counter}`;
  tests[testKey] = {
    id: testKey.split(':') as TestId,
    name: normalizeNodeLabel(node.label, node.kind),
    group: parentGroups,
    status: 'undetermined',
    isWaiting: false,
    isRunning: false,
    isStatic: true,
    location: buildStaticLocation(node, workspace.path, packagePath, fallbackEntryFile),
  };
}

function buildStaticLocation(
  node: ExtractedNode,
  workspacePath: string,
  packagePath: string,
  fallbackEntryFile: string | null,
): TestLocation | undefined {
  const line = node.line ?? 1;

  let filePath: string | null = null;
  if (typeof node.file === 'string' && node.file.length > 0) {
    filePath = path.resolve(workspacePath, normalizePathSlashes(node.file));
  } else if (fallbackEntryFile !== null) {
    filePath = path.resolve(workspacePath, normalizePathSlashes(fallbackEntryFile));
  }

  if (!filePath) {
    return undefined;
  }

  return {
    uri: path.relative(packagePath, filePath),
    range: {
      start: {
        line: line - 1,
        character: 0,
      },
      end: {
        line: line - 1,
        character: 0,
      },
    },
  };
}

function normalizeNodeLabel(label: string | null, kind: ExtractedNode['kind']): string {
  const trimmed = label?.trim() ?? '';
  if (trimmed.length > 0) {
    return trimmed;
  }

  if (kind === 'group') {
    return '(group)';
  }
  if (kind === 'placeholder') {
    return '(dynamic placeholder)';
  }
  return '(unnamed test)';
}

function normalizePathSlashes(value: string): string {
  return value.replace(/\\/g, '/');
}

function hasOwnKey<T extends object>(obj: T, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}