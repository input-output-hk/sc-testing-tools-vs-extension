import * as path from 'path';
import * as fs from 'fs';

import type { ParsedSuiteDefinition } from '../discover';

import { extractTree, ExtractContext } from './extract';
import { ModuleCache } from './parser';
import { FollowState } from './resolver';
import type { ExtractedNode } from './synthesize';

export type ExtractedSuite = {
  suite: string;
  packageDir: string;
  entryFile: string | null;
  entryBinding: string | null;
  entryPoint: ParsedSuiteDefinition['entryPoint'];
  hsSourceDirs: Array<string>;
  tree: ExtractedNode | Array<ExtractedNode> | null;
};

export function extractSuite(
  suiteDescriptor: {
    suite: string;
    packageDir: string;
    mainIs: string;
    hsSourceDirs: Array<string>;
    entryPoint: ParsedSuiteDefinition['entryPoint'];
  },
  workspacePath: string,
  moduleCache: ModuleCache,
): ExtractedSuite {
  const packageRoot = path.resolve(workspacePath, suiteDescriptor.packageDir);
  const sourceRoots = suiteDescriptor.hsSourceDirs.length > 0
    ? suiteDescriptor.hsSourceDirs
    : ['.'];

  const baseDirs = sourceRoots.map((sourceDir) => path.resolve(packageRoot, sourceDir));
  const entryFile = resolveEntryFile(packageRoot, suiteDescriptor.mainIs);

  if (entryFile === null) {
    return {
      suite: suiteDescriptor.suite,
      packageDir: suiteDescriptor.packageDir,
      entryFile: null,
      entryBinding: null,
      entryPoint: suiteDescriptor.entryPoint,
      hsSourceDirs: suiteDescriptor.hsSourceDirs,
      tree: null,
    };
  }

  const entryModule = moduleCache.parse(entryFile);
  const follow = new FollowState(100);

  const context = new ExtractContext({
    root: workspacePath,
    moduleCache,
    baseDirs,
    follow,
  });

  const extracted = extractTree(entryModule, context);

  return {
    suite: suiteDescriptor.suite,
    packageDir: suiteDescriptor.packageDir,
    entryFile,
    entryBinding: extracted.entryBinding,
    entryPoint: suiteDescriptor.entryPoint,
    hsSourceDirs: suiteDescriptor.hsSourceDirs,
    tree: extracted.tree,
  };
}

function resolveEntryFile(packageRoot: string, mainIs: string): string | null {
  const candidate = path.resolve(packageRoot, mainIs);
  if (fs.existsSync(candidate)) {
    return candidate;
  }
  return null;
}
