import * as fs from 'fs/promises';
import * as path from 'path';
import type { Dirent } from 'fs';
import * as fsSync from 'fs';

import { getParser, ModuleCache } from './static/parser';
import { extractSuite, type ExtractedSuite } from './static/suites';
import type { ExtractedNode } from './static/synthesize';

const EXCLUDED_DIRECTORIES = new Set([
  'dist-newstyle',
  'tasty-investigate',
  '.git',
  'node_modules',
]);

export interface DiscoveredSuite {
  name: string;
  tree: TestTree;
  tests: Array<Test>;
}

export interface DiscoveredPackage {
  name: string;
  packagePath: string;
  suites: Array<DiscoveredSuite>;
}

type EntryPointClassification = 'STREAMING' | 'upstream' | 'unknown' | 'MISSING';

interface ParsedSuiteDefinition {
  name: string;
  mainIs: string;
  hsSourceDirs: Array<string>;
  entryPoint: EntryPointClassification;
}

interface ParsedCabalPackage {
  name: string;
  packagePath: string;
  suites: Array<ParsedSuiteDefinition>;
}

interface StaticTreeBuildResult {
  tree: TestTree;
  tests: Array<Test>;
}

export async function discoverPackages(workspacePath: string): Promise<Array<DiscoveredPackage>> {

  await ensureWorkspaceDirectory(workspacePath);

  const parser = await getParser();
  const moduleCache = new ModuleCache(parser);

  const cabalFiles = await collectCabalFiles(workspacePath);
  const discoveredPackages: Array<DiscoveredPackage> = [];

  for (const cabalFile of cabalFiles) {
    try {
      const content = await fs.readFile(cabalFile, 'utf8');
      const parsedPackage = parseCabalFile(content, cabalFile);
      const discoveredPackage = buildDiscoveredPackage(parsedPackage, workspacePath, moduleCache);
      discoveredPackages.push(discoveredPackage);
    } catch (error) {
      console.error(`Skipping unreadable cabal file: ${cabalFile}`, error);
    }
  }

  return discoveredPackages;
}

async function ensureWorkspaceDirectory(workspacePath: string): Promise<void> {
  let stat;
  try {
    stat = await fs.stat(workspacePath);
  } catch {
    throw new Error(`Workspace path does not exist: ${workspacePath}`);
  }

  if (!stat.isDirectory()) {
    throw new Error(`Workspace path is not a directory: ${workspacePath}`);
  }
}

async function collectCabalFiles(rootPath: string): Promise<Array<string>> {
  const cabalFiles: Array<string> = [];
  await walkDirectories(rootPath, cabalFiles);
  cabalFiles.sort((left, right) => left.localeCompare(right));
  return cabalFiles;
}

async function walkDirectories(directoryPath: string, cabalFiles: Array<string>): Promise<void> {
  let entries: Array<Dirent>;
  try {
    entries = await fs.readdir(directoryPath, { withFileTypes: true });
  } catch (error) {
    console.error(`Unable to read directory during suite discovery: ${directoryPath}`, error);
    return;
  }

  entries.sort((left, right) => left.name.localeCompare(right.name));

  for (const entry of entries) {
    const entryPath = path.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      if (EXCLUDED_DIRECTORIES.has(entry.name)) {
        continue;
      }
      await walkDirectories(entryPath, cabalFiles);
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.cabal')) {
      cabalFiles.push(entryPath);
    }
  }
}

function buildDiscoveredPackage(
  parsedPackage: ParsedCabalPackage,
  workspacePath: string,
  moduleCache: ModuleCache
): DiscoveredPackage {
  const packageDirectory = normalizePathSlashes(path.relative(workspacePath, parsedPackage.packagePath) || '.');
  const suites: Array<DiscoveredSuite> = parsedPackage.suites.map((suiteDefinition) => {
    const extractedSuite = extractSuite(
      {
        suite: suiteDefinition.name,
        packageDir: packageDirectory,
        mainIs: suiteDefinition.mainIs,
        hsSourceDirs: suiteDefinition.hsSourceDirs,
        entryPoint: suiteDefinition.entryPoint,
      },
      workspacePath,
      moduleCache
    );

    const treeBuildResult = buildStaticSuiteTree(
      workspacePath,
      parsedPackage.name,
      parsedPackage.packagePath,
      suiteDefinition.name,
      extractedSuite
    );

    return {
      name: suiteDefinition.name,
      tree: treeBuildResult.tree,
      tests: treeBuildResult.tests,
    };
  });

  return {
    name: parsedPackage.name,
    packagePath: parsedPackage.packagePath,
    suites,
  };
}

function parseCabalFile(content: string, cabalFilePath: string): ParsedCabalPackage {
  const lines = content.split(/\r?\n/);

  const parsedName = parsePackageName(lines);
  const packageName = parsedName !== null && parsedName.length > 0
    ? parsedName
    : path.basename(cabalFilePath, '.cabal');

  const packagePath = path.dirname(cabalFilePath);
  const suiteDefinitions = parseSuiteDefinitions(lines, packagePath);

  return {
    name: packageName,
    packagePath,
    suites: suiteDefinitions,
  };
}

function parsePackageName(lines: Array<string>): string | null {
  for (const rawLine of lines) {
    const lineWithoutComment = stripComment(rawLine).trimEnd();
    if (lineWithoutComment.length === 0) {
      continue;
    }

    if (/^\s/.test(lineWithoutComment)) {
      continue;
    }

    const match = lineWithoutComment.match(/^name\s*:\s*(.+)$/i);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
}

function parseSuiteDefinitions(
  lines: Array<string>,
  packagePath: string
): Array<ParsedSuiteDefinition> {
  const suiteDefinitions: Array<ParsedSuiteDefinition> = [];

  let currentSuite:
    | {
        name: string;
        mainIsRaw: string | null;
        hsSourceDirsRaw: string;
      }
    | null = null;

  const flushSuite = (): void => {
    if (currentSuite === null) {
      return;
    }

    const hsSourceDirs = parseHsSourceDirs(currentSuite.hsSourceDirsRaw);
    const resolvedMainPath = resolveMainPath(packagePath, currentSuite.mainIsRaw, hsSourceDirs);
    const entryPoint = classifyEntryPoint(resolvedMainPath, packagePath);

    suiteDefinitions.push({
      name: currentSuite.name,
      mainIs: resolvedMainPath ?? 'MISSING',
      hsSourceDirs,
      entryPoint,
    });

    currentSuite = null;
  };

  for (const rawLine of lines) {
    const lineWithoutComment = stripComment(rawLine).trimEnd();
    if (lineWithoutComment.trim().length === 0) {
      continue;
    }

    const isTopLevel = !/^\s/.test(lineWithoutComment);
    if (isTopLevel) {
      flushSuite();
      const suiteMatch = lineWithoutComment.match(/^test-suite\s+(\S+)/i);
      if (suiteMatch && suiteMatch[1]) {
        currentSuite = {
          name: suiteMatch[1].trim(),
          mainIsRaw: null,
          hsSourceDirsRaw: '.',
        };
      }
      continue;
    }

    if (currentSuite === null) {
      continue;
    }

    const trimmed = lineWithoutComment.trim();

    const mainMatch = trimmed.match(/^main-is\s*:\s*(.+)$/i);
    if (mainMatch && mainMatch[1]) {
      currentSuite.mainIsRaw = normalizePathSlashes(mainMatch[1].trim());
      continue;
    }

    const sourceDirsMatch = trimmed.match(/^hs-source-dirs\s*:\s*(.+)$/i);
    if (sourceDirsMatch && sourceDirsMatch[1]) {
      currentSuite.hsSourceDirsRaw = sourceDirsMatch[1].trim();
    }
  }

  flushSuite();

  const seen = new Set<string>();
  const uniqueSuites: Array<ParsedSuiteDefinition> = [];
  for (const suite of suiteDefinitions) {
    if (seen.has(suite.name)) {
      continue;
    }
    seen.add(suite.name);
    uniqueSuites.push(suite);
  }

  return uniqueSuites;
}

function parseHsSourceDirs(sourceDirsRaw: string): Array<string> {
  const normalized = sourceDirsRaw.trim().replace(/[\s,]+/g, ' ');
  if (normalized.length === 0) {
    return ['.'];
  }

  const sourceDirs = normalized
    .split(' ')
    .map((dir) => normalizePathSlashes(dir.trim()))
    .filter((dir) => dir.length > 0);

  return sourceDirs.length > 0 ? sourceDirs : ['.'];
}

function resolveMainPath(
  packagePath: string,
  mainIsRaw: string | null,
  hsSourceDirs: Array<string>
): string | null {
  if (mainIsRaw === null || mainIsRaw.length === 0) {
    return null;
  }

  const normalizedMain = normalizePathSlashes(mainIsRaw);
  const candidateDirs = hsSourceDirs.length > 0 ? hsSourceDirs : ['.'];

  for (const sourceDir of candidateDirs) {
    const relativePath = normalizePathSlashes(path.join(sourceDir, normalizedMain));
    const absolutePath = path.join(packagePath, relativePath);
    if (fsSync.existsSync(absolutePath)) {
      return relativePath;
    }
  }

  return null;
}

function classifyEntryPoint(
  resolvedMainPath: string | null,
  packagePath: string
): EntryPointClassification {
  if (resolvedMainPath === null) {
    return 'MISSING';
  }

  const absoluteMainPath = path.resolve(packagePath, resolvedMainPath);
  if (!fsSync.existsSync(absoluteMainPath)) {
    return 'MISSING';
  }

  let content = '';
  try {
    content = fsSync.readFileSync(absoluteMainPath, 'utf8');
  } catch {
    return 'unknown';
  }

  if (
    /defaultMainStreamingWithIngredients|defaultMainStreaming|defaultMainTestingInterface|Convex\.Tasty\.Streaming|Convex\.TestingInterface/.test(
      content
    )
  ) {
    return 'STREAMING';
  }

  if (/\bdefaultMain\b|defaultMainWithIngredients/.test(content)) {
    return 'upstream';
  }

  return 'unknown';
}

function buildStaticSuiteTree(
  workspacePath: string,
  packageName: string,
  packagePath: string,
  suiteName: string,
  extractedSuite: ExtractedSuite
): StaticTreeBuildResult {
  const tree: TestTree = {};
  const tests: Array<Test> = [];
  const packageFingerprint = buildPackageFingerprint(workspacePath, packagePath);

  const nodes = toNodeArray(extractedSuite.tree);
  const idState = { counter: 0 };

  for (const node of nodes) {
    appendExtractedNode({
      node,
      parentTree: tree,
      parentGroups: [],
      tests,
      idState,
      workspacePath,
      packagePath,
      packageName,
      suiteName,
      packageFingerprint,
      fallbackEntryFile: extractedSuite.entryFile,
    });
  }

  return { tree, tests };
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
  parentTree: TestTree;
  parentGroups: Array<string>;
  tests: Array<Test>;
  idState: { counter: number };
  workspacePath: string;
  packagePath: string;
  packageName: string;
  suiteName: string;
  packageFingerprint: string;
  fallbackEntryFile: string | null;
}): void {
  const {
    node,
    parentTree,
    parentGroups,
    tests,
    idState,
    workspacePath,
    packagePath,
    packageName,
    suiteName,
    packageFingerprint,
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
        tests,
        idState,
        workspacePath,
        packagePath,
        packageName,
        suiteName,
        packageFingerprint,
        fallbackEntryFile,
      });
    }

    return;
  }

  idState.counter += 1;
  const staticTestId = `${packageName}:${suiteName}:s${idState.counter}:${packageFingerprint}`;
  const testName = normalizeNodeLabel(node.label, node.kind);
  const location = buildStaticLocation(node, workspacePath, packagePath, fallbackEntryFile);

  const test: Test = {
    id: staticTestId,
    name: testName,
    group: parentGroups,
    location,
    status: 'undetermined',
    source: 'static',
    isRunnable: false,
    isPlaceholder: node.kind === 'placeholder',
    note: node.note,
  };

  tests.push(test);
  parentTree[staticTestId] = {
    type: 'test',
    testId: staticTestId,
  } as TestTreeTestNode;
}

function buildStaticLocation(
  node: ExtractedNode,
  workspacePath: string,
  packagePath: string,
  fallbackEntryFile: string | null
): Location {
  const line = node.line ?? 1;

  let filePath = packagePath;
  if (typeof node.file === 'string' && node.file.length > 0) {
    filePath = path.isAbsolute(node.file)
      ? node.file
      : path.resolve(workspacePath, normalizePathSlashes(node.file));
  } else if (fallbackEntryFile !== null) {
    filePath = path.resolve(workspacePath, normalizePathSlashes(fallbackEntryFile));
  }

  return {
    uri: filePath,
    startLine: line,
    startCharacter: 1,
    endLine: line,
    endCharacter: 1,
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

function makeUniqueTreeKey(tree: TestTree, preferredKey: string): string {
  if (!tree[preferredKey]) {
    return preferredKey;
  }

  let suffix = 2;
  let key = `${preferredKey} (${suffix})`;
  while (tree[key]) {
    suffix += 1;
    key = `${preferredKey} (${suffix})`;
  }
  return key;
}

function normalizePathSlashes(value: string): string {
  return value.replace(/\\/g, '/');
}

function buildPackageFingerprint(workspacePath: string, packagePath: string): string {
  const relativePath = normalizePathSlashes(path.relative(workspacePath, packagePath) || '.');
  return relativePath.replace(/[^A-Za-z0-9]+/g, '_');
}

function stripComment(line: string): string {
  const commentIndex = line.indexOf('--');
  if (commentIndex < 0) {
    return line;
  }
  return line.slice(0, commentIndex);
}