import * as fs from 'fs/promises';
import * as path from 'path';
import type { Dirent } from 'fs';

const EXCLUDED_DIRECTORIES = new Set([
  'dist-newstyle',
  'tasty-investigate',
  '.git',
  'node_modules',
]);

export interface DiscoveredSuite {
  name: string;
}

export interface DiscoveredPackage {
  name: string;
  suites: Array<DiscoveredSuite>;
}

export async function discoverPackages(workspacePath: string): Promise<Array<DiscoveredPackage>> {
  
  await ensureWorkspaceDirectory(workspacePath);

  const cabalFiles = await collectCabalFiles(workspacePath);
  const discoveredPackages: Array<DiscoveredPackage> = [];

  for (const cabalFile of cabalFiles) {
    try {
      const content = await fs.readFile(cabalFile, 'utf8');
      const discoveredPackage = parseCabalFile(content, cabalFile);
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

function parseCabalFile(content: string, cabalFilePath: string): DiscoveredPackage {
  const lines = content.split(/\r?\n/);

  const parsedName = parsePackageName(lines);
  const packageName = parsedName !== null && parsedName.length > 0
    ? parsedName
    : path.basename(cabalFilePath, '.cabal');

  const suiteNames = parseSuiteNames(lines);
  return {
    name: packageName,
    suites: suiteNames.map((suiteName) => ({ name: suiteName })),
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

function parseSuiteNames(lines: Array<string>): Array<string> {
  const suiteNames: Array<string> = [];
  let currentSuiteName: string | null = null;

  for (const rawLine of lines) {
    const lineWithoutComment = stripComment(rawLine).trimEnd();

    if (/^[A-Za-z]/.test(lineWithoutComment)) {
      const suiteMatch = lineWithoutComment.match(/^test-suite\s+(\S+)/i);

      if (suiteMatch && suiteMatch[1]) {
        if (currentSuiteName !== null) {
          suiteNames.push(currentSuiteName);
        }
        currentSuiteName = suiteMatch[1].trim();
        continue;
      }

      if (currentSuiteName !== null) {
        suiteNames.push(currentSuiteName);
        currentSuiteName = null;
      }
    }
  }

  if (currentSuiteName !== null) {
    suiteNames.push(currentSuiteName);
  }

  return [...new Set(suiteNames)];
}

function stripComment(line: string): string {
  const commentIndex = line.indexOf('--');
  if (commentIndex < 0) {
    return line;
  }
  return line.slice(0, commentIndex);
}