import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import type { Dirent } from 'fs';

const EXCLUDED_DIRECTORIES = new Set([
  'dist-newstyle',
  'tasty-investigate',
  '.git',
  'node_modules',
]);

const IMPLICIT_PROJECT = '__IMPLICIT_NULL__';

export type EntryPointClassification = 'STREAMING' | 'upstream' | 'unknown' | 'MISSING';

export interface ParsedSuiteDefinition {
  name: string;
  mainIs: string;
  hsSourceDirs: Array<string>;
  entryPoint: EntryPointClassification;
}

export interface ParsedCabalPackage {
  name: string;
  packagePath: string;
  packageDir: string;
  suites: Array<ParsedSuiteDefinition>;
}

export async function discoverPackagesForWorkspace(workspacePath: string): Promise<Array<ParsedCabalPackage>> {
  await ensureWorkspaceDirectory(workspacePath);

  const cabalFiles = await collectCabalFiles(workspacePath);
  const ownership = await buildPrimaryOwnership(workspacePath, cabalFiles);

  const discoveredPackages: Array<ParsedCabalPackage> = [];
  for (const cabalFile of cabalFiles) {
    if (!ownership.has(cabalFile)) {
      continue;
    }

    try {
      const content = await fs.readFile(cabalFile, 'utf8');
      const parsedPackage = parseCabalFile(content, cabalFile, workspacePath);
      discoveredPackages.push(parsedPackage);
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
  await walkDirectories(path.resolve(rootPath), cabalFiles);
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
      cabalFiles.push(normalizePathSlashes(path.resolve(entryPath)));
    }
  }
}

async function buildPrimaryOwnership(
  workspacePath: string,
  cabalFiles: Array<string>,
): Promise<Map<string, string>> {
  const projectFiles = await discoverProjectFiles(workspacePath);
  const ownerMap = new Map<string, Set<string>>();

  if (projectFiles.length > 0) {
    for (const projectFile of projectFiles) {
      const projectRel = relToRoot(workspacePath, projectFile);
      const visited = new Set<string>();
      const projectPackages = collectProjectPackages(projectFile, cabalFiles, visited);

      for (const cabalFile of projectPackages) {
        if (!ownerMap.has(cabalFile)) {
          ownerMap.set(cabalFile, new Set<string>());
        }
        ownerMap.get(cabalFile)!.add(projectRel);
      }
    }
  } else {
    for (const cabalFile of cabalFiles) {
      ownerMap.set(cabalFile, new Set<string>([IMPLICIT_PROJECT]));
    }
  }

  const primaryOwners = new Map<string, string>();
  for (const [cabalFile, owners] of ownerMap.entries()) {
    const selected = selectPrimaryOwner(owners);
    if (selected !== null) {
      primaryOwners.set(cabalFile, selected);
    }
  }

  return primaryOwners;
}

async function discoverProjectFiles(workspacePath: string): Promise<Array<string>> {
  let entries: Array<Dirent>;
  try {
    entries = await fs.readdir(workspacePath, { withFileTypes: true });
  } catch {
    return [];
  }

  const projectFiles = entries
    .filter((entry) => {
      if (!entry.isFile()) {
        return false;
      }

      if (entry.name === 'cabal.project') {
        return true;
      }

      if (!entry.name.startsWith('cabal.project.')) {
        return false;
      }

      return !entry.name.endsWith('.freeze') && !entry.name.endsWith('.local');
    })
    .map((entry) => normalizePathSlashes(path.resolve(workspacePath, entry.name)))
    .sort((left, right) => left.localeCompare(right));

  return projectFiles;
}

function collectProjectPackages(
  projectFile: string,
  allCabalFiles: Array<string>,
  visited: Set<string>,
): Set<string> {
  const normalizedProjectFile = normalizePathSlashes(path.resolve(projectFile));
  if (visited.has(normalizedProjectFile)) {
    return new Set<string>();
  }
  visited.add(normalizedProjectFile);

  const discovered = new Set<string>();
  const projectDir = path.dirname(normalizedProjectFile);

  let content = '';
  try {
    content = fsSync.readFileSync(normalizedProjectFile, 'utf8');
  } catch {
    return discovered;
  }

  const lines = content.split(/\r?\n/);
  let inPackages = false;
  let inSourceRepositoryPackage = false;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, '');
    const stripped = stripComment(line);

    if (/^source-repository-package\b/.test(stripped)) {
      inSourceRepositoryPackage = true;
      inPackages = false;
      continue;
    }

    if (inSourceRepositoryPackage) {
      if (/^[^\s]/.test(stripped)) {
        inSourceRepositoryPackage = false;
      } else {
        continue;
      }
    }

    const importMatch = stripped.match(/^\s*[Ii]mport:\s*(.+)$/);
    if (importMatch && importMatch[1]) {
      const importPath = importMatch[1].trim();
      if (importPath.length > 0) {
        const nestedProject = normalizePathSlashes(path.resolve(projectDir, importPath));
        const nestedPackages = collectProjectPackages(nestedProject, allCabalFiles, visited);
        for (const packageFile of nestedPackages) {
          discovered.add(packageFile);
        }
      }
      inPackages = false;
      continue;
    }

    const packagesMatch = stripped.match(/^\s*[Pp]ackages:\s*(.*)$/);
    if (packagesMatch) {
      inPackages = true;
      for (const token of tokenizeProjectEntries(packagesMatch[1])) {
        for (const cabalFile of resolvePackageEntry(projectDir, token, allCabalFiles)) {
          discovered.add(cabalFile);
        }
      }
      continue;
    }

    if (/^[^\s]/.test(stripped)) {
      inPackages = false;
      continue;
    }

    if (inPackages) {
      for (const token of tokenizeProjectEntries(stripped)) {
        for (const cabalFile of resolvePackageEntry(projectDir, token, allCabalFiles)) {
          discovered.add(cabalFile);
        }
      }
    }
  }

  return discovered;
}

function tokenizeProjectEntries(value: string): Array<string> {
  return value
    .trim()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

function resolvePackageEntry(
  projectDir: string,
  entry: string,
  allCabalFiles: Array<string>,
): Array<string> {
  const target = normalizePathSlashes(path.resolve(projectDir, entry));
  const results = new Set<string>();

  const hasGlob = entry.includes('*') || entry.includes('?');
  if (hasGlob) {
    const matcher = globPatternToRegExp(target);
    for (const cabalFile of allCabalFiles) {
      if (matcher.test(cabalFile)) {
        results.add(cabalFile);
      }
    }
  } else if (entry.endsWith('.cabal')) {
    if (fsSync.existsSync(target) && fsSync.statSync(target).isFile()) {
      results.add(target);
    }
  }

  if (results.size === 0 && fsSync.existsSync(target) && fsSync.statSync(target).isDirectory()) {
    const normalizedTarget = normalizePathSlashes(target);
    for (const cabalFile of allCabalFiles) {
      if (normalizePathSlashes(path.dirname(cabalFile)) === normalizedTarget) {
        results.add(cabalFile);
      }
    }
  }

  return Array.from(results).sort((left, right) => left.localeCompare(right));
}

function globPatternToRegExp(absolutePattern: string): RegExp {
  const escaped = normalizePathSlashes(absolutePattern)
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\\\*/g, '[^/]*')
    .replace(/\\\?/g, '[^/]');

  return new RegExp(`^${escaped}$`);
}

function selectPrimaryOwner(owners: Set<string>): string | null {
  if (owners.size === 0) {
    return null;
  }

  if (owners.has('cabal.project')) {
    return 'cabal.project';
  }

  if (owners.has(IMPLICIT_PROJECT)) {
    return IMPLICIT_PROJECT;
  }

  return Array.from(owners).sort((left, right) => left.localeCompare(right))[0] ?? null;
}

function parseCabalFile(content: string, cabalFilePath: string, workspacePath: string): ParsedCabalPackage {
  const lines = content.split(/\r?\n/);

  const parsedName = parsePackageName(lines);
  const packageName = parsedName !== null && parsedName.length > 0
    ? parsedName
    : path.basename(cabalFilePath, '.cabal');

  const packagePath = normalizePathSlashes(path.dirname(cabalFilePath));
  const packageDir = normalizePathSlashes(path.relative(workspacePath, packagePath) || '.');
  const suiteDefinitions = parseSuiteDefinitions(lines, packagePath);

  return {
    name: packageName,
    packagePath,
    packageDir,
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
  packagePath: string,
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

  return suiteDefinitions;
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
  hsSourceDirs: Array<string>,
): string | null {
  if (mainIsRaw === null || mainIsRaw.length === 0) {
    return null;
  }

  const normalizedMain = normalizePathSlashes(mainIsRaw);
  const candidateDirs = hsSourceDirs.length > 0 ? hsSourceDirs : ['.'];

  for (const sourceDir of candidateDirs) {
    const relativePath = normalizePathSlashes(path.join(sourceDir, normalizedMain));
    const absolutePath = path.resolve(packagePath, relativePath);
    if (fsSync.existsSync(absolutePath) && fsSync.statSync(absolutePath).isFile()) {
      return relativePath;
    }
  }

  return null;
}

function classifyEntryPoint(
  resolvedMainPath: string | null,
  packagePath: string,
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
      content,
    )
  ) {
    return 'STREAMING';
  }

  if (/\bdefaultMain\b|defaultMainWithIngredients/.test(content)) {
    return 'upstream';
  }

  return 'unknown';
}

function relToRoot(rootPath: string, absolutePath: string): string {
  return normalizePathSlashes(path.relative(rootPath, absolutePath));
}

function stripComment(line: string): string {
  const commentIndex = line.indexOf('--');
  if (commentIndex < 0) {
    return line;
  }
  return line.slice(0, commentIndex);
}

function normalizePathSlashes(value: string): string {
  return value.replace(/\\/g, '/');
}
