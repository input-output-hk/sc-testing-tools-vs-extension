import * as fs from 'fs';
import * as path from 'path';

import { ExtractContext, extractTree } from './extract';
import { FollowState } from './resolver';
import type { ModuleCache } from './parser';
import type { ExtractedNode } from './synthesize';

export type StaticSuiteExtractionInput = {
  suite: string;
  packageDir: string;
  mainIs: string;
  hsSourceDirs: Array<string>;
  entryPoint: 'STREAMING' | 'upstream' | 'unknown' | 'MISSING';
};

export type ExtractedSuite = {
  suite: string;
  package: string;
  entryFile: string | null;
  entryPoint: 'STREAMING' | 'upstream' | 'unknown' | 'MISSING';
  tree: ExtractedNode | Array<ExtractedNode> | null;
  note?: string;
  entryBinding?: string;
  crossFileFollows?: number;
};

function suiteBaseDirs(root: string, packageDir: string, hsSourceDirs: Array<string>): Array<string> {
  const sourceDirs = hsSourceDirs.length > 0 ? hsSourceDirs : ['.'];
  return sourceDirs.map((dir) => path.resolve(root, packageDir, dir));
}

export function extractSuite(
  suite: StaticSuiteExtractionInput,
  root: string,
  moduleCache: ModuleCache,
  followLimit = 100
): ExtractedSuite {
  const result: ExtractedSuite = {
    suite: suite.suite,
    package: suite.packageDir,
    entryFile: null,
    entryPoint: suite.entryPoint,
    tree: null,
  };

  if (!suite.mainIs || suite.mainIs === 'MISSING') {
    result.note = 'main-is is MISSING in cabal metadata; cannot locate entry file';
    return result;
  }

  const entryPath = path.resolve(root, suite.packageDir, suite.mainIs);
  result.entryFile = path.relative(root, entryPath);

  if (!fs.existsSync(entryPath)) {
    result.note = `entry file not found: ${result.entryFile}`;
    return result;
  }

  const baseDirs = suiteBaseDirs(root, suite.packageDir, suite.hsSourceDirs);

  let entryModule;
  try {
    entryModule = moduleCache.parse(entryPath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    result.note = `failed to parse entry file: ${message}`;
    return result;
  }

  const context = new ExtractContext({
    root,
    moduleCache,
    baseDirs,
    follow: new FollowState(followLimit),
  });

  try {
    const extraction = extractTree(entryModule, context);
    result.tree = extraction.tree;
    result.entryBinding = extraction.entryBinding ?? undefined;
    result.crossFileFollows = context.follow.opens;
    if (extraction.tree === null) {
      result.note = 'no tasty entry (main/tests/testGroup) located in entry file';
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    result.note = `extraction error: ${message}`;
    result.tree = null;
  }

  return result;
}
