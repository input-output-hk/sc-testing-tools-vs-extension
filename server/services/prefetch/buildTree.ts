import * as path from 'path';

import {
  ParsedCabalPackage,
  ParsedSuiteDefinition,
} from './discover';

import { getParser, ModuleCache } from './static/parser';
import { extractSuite, type ExtractedSuite } from './static/suites';
import type { ExtractedNode } from './static/synthesize';

interface StaticTreeBuildResult {
  tests: TestTreeNodeMap;
}

export async function buildWorkspacePackages(
  workspace: Workspace,
  discoveredPackages: Array<ParsedCabalPackage>,
): Promise<TestPackageMap> {
  const parser = await getParser();
  const moduleCache = new ModuleCache(parser);

  const packageMap: TestPackageMap = {};

  for (const discoveredPackage of discoveredPackages) {
    const packageId = `${workspace.id}:${discoveredPackage.name}`;

    if (!hasOwnKey(packageMap, packageId)) {
      packageMap[packageId] = {
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

      if (!suite) {
        continue;
      }

      if (!hasOwnKey(packageNode.suites, suite.name)) {
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
): TestSuite | null {
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

  const staticTree = buildStaticSuiteTree(
    workspace,
    discoveredPackage.name,
    discoveredPackage.packagePath,
    suiteDefinition.name,
    extractedSuite,
  );

  return {
    name: suiteDefinition.name,
    status: 'undetermined',
    isOpen: false,
    tests: staticTree.tests,
  };
}

function buildStaticSuiteTree(
  workspace: Workspace,
  packageName: string,
  packagePath: string,
  suiteName: string,
  extractedSuite: ExtractedSuite,
): StaticTreeBuildResult {
  const tests: TestTreeNodeMap = {};

  const nodes = toNodeArray(extractedSuite.tree);
  const idState = { counter: 0 };

  for (const node of nodes) {
    appendExtractedNode({
      node,
      parentTree: tests,
      parentGroups: [],
      idState,
      workspace,
      packageName,
      packagePath,
      suiteName,
      fallbackEntryFile: extractedSuite.entryFile,
    });
  }

  return { tests };
}

function toNodeArray(tree: ExtractedSuite['tree']): Array<ExtractedNode> {
  if (tree === null) {
    return [];
  }
  if (Array.isArray(tree)) {
    return tree;
  }
  return [tree];
}

function appendExtractedNode(options: {
  node: ExtractedNode;
  parentTree: TestTreeNodeMap;
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
    parentTree,
    parentGroups,
    idState,
    workspace,
    packageName,
    packagePath,
    suiteName,
    fallbackEntryFile,
  } = options;

  if (node.kind === 'group') {
    const groupName = normalizeNodeLabel(node.label, 'group');
    const groupKey = makeUniqueTreeKey(parentTree, groupName);

    const groupNode: TestTreeGroupNode = {
      type: 'group',
      name: groupName,
      isOpen: false,
      nodes: {},
    };

    parentTree[groupKey] = groupNode;

    for (const child of node.children ?? []) {
      appendExtractedNode({
        node: child,
        parentTree: groupNode.nodes,
        parentGroups: [...parentGroups, groupName],
        idState,
        workspace,
        packageName,
        packagePath,
        suiteName,
        fallbackEntryFile,
      });
    }

    return;
  }

  idState.counter += 1;
  const testKey = `${workspace.id}:${packageName}:${suiteName}:static${idState.counter}`;
  const testName = normalizeNodeLabel(node.label, node.kind);

  const test: Test = {
    id: testKey.split(':') as TestId,
    name: testName,
    group: parentGroups,
    status: 'undetermined',
    location: buildStaticLocation(node, workspace.path, packagePath, fallbackEntryFile),
  };

  parentTree[testKey] = {
    type: 'test',
    test,
  } as TestTreeTestNode;
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

function makeUniqueTreeKey(tree: TestTreeNodeMap, preferredKey: string): string {
  if (!hasOwnKey(tree, preferredKey)) {
    return preferredKey;
  }

  let suffix = 2;
  let key = `${preferredKey} (${suffix})`;

  while (hasOwnKey(tree, key)) {
    suffix += 1;
    key = `${preferredKey} (${suffix})`;
  }

  return key;
}

function normalizePathSlashes(value: string): string {
  return value.replace(/\\/g, '/');
}

function hasOwnKey<T extends object>(obj: T, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}
