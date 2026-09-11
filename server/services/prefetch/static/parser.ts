import * as fs from 'fs';
import * as path from 'path';

import { parseImports, type ImportTable } from './imports';
import { nodeField, type NodeLike } from './ast';

const webTreeSitter = require('web-tree-sitter') as typeof import('web-tree-sitter');

export type ParsedModule = {
  file: string;
  source: string;
  tree: import('web-tree-sitter').Tree;
  binds: Map<string, NodeLike>;
  instances: Array<{ name: string | null; patterns: string | null; node: NodeLike }>;
  imports: ImportTable;
};

let parserInstance: import('web-tree-sitter').Parser | null = null;
let grammarWasmPath: string | null = null;

function resolveGrammarWasm(): string {
  const packageDirectory = path.dirname(require.resolve('tree-sitter-haskell/package.json'));
  const packagedGrammar = path.join(packageDirectory, 'tree-sitter-haskell.wasm');

  const candidates = [
    packagedGrammar,
    path.join(__dirname, '..', '..', '..', '..', '..', 'vendor', 'tree-sitter-haskell.wasm'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    `tree-sitter-haskell grammar wasm not found. Looked in: ${candidates.join(', ')}`,
  );
}

export async function getParser(): Promise<import('web-tree-sitter').Parser> {
  if (parserInstance !== null) {
    return parserInstance;
  }

  grammarWasmPath = resolveGrammarWasm();
  await webTreeSitter.Parser.init();
  const haskellLanguage = await webTreeSitter.Language.load(grammarWasmPath);

  parserInstance = new webTreeSitter.Parser();
  parserInstance.setLanguage(haskellLanguage);
  return parserInstance;
}

export function getGrammarPath(): string | null {
  return grammarWasmPath;
}

function indexDecls(
  declarationsContainer: NodeLike | null,
  binds: Map<string, NodeLike>,
  instances: Array<{ name: string | null; patterns: string | null; node: NodeLike }>,
): void {
  if (declarationsContainer === null) {
    return;
  }

  for (const child of declarationsContainer.namedChildren) {
    if (child.type === 'bind' || child.type === 'function') {
      const nameNode = nodeField(child, 'name');
      if (nameNode !== null && !binds.has(nameNode.text)) {
        binds.set(nameNode.text, child);
      }
      continue;
    }

    if (child.type === 'instance') {
      const nameNode = nodeField(child, 'name');
      const patternsNode = nodeField(child, 'patterns');
      instances.push({
        name: nameNode !== null ? nameNode.text : null,
        patterns: patternsNode !== null ? patternsNode.text.trim() : null,
        node: child,
      });
    }
  }
}

export class ModuleCache {
  private parser: import('web-tree-sitter').Parser;
  private cache = new Map<string, ParsedModule>();

  constructor(parser: import('web-tree-sitter').Parser) {
    this.parser = parser;
  }

  public parse(filePath: string): ParsedModule {
    const absolutePath = path.resolve(filePath);
    if (this.cache.has(absolutePath)) {
      return this.cache.get(absolutePath)!;
    }

    const source = fs.readFileSync(absolutePath, 'utf8');
    const tree = this.parser.parse(source);
    if (tree === null) {
      throw new Error(`Unable to parse source file: ${absolutePath}`);
    }

    const binds = new Map<string, NodeLike>();
    const instances: Array<{ name: string | null; patterns: string | null; node: NodeLike }> = [];

    const rootNode = tree.rootNode as unknown as NodeLike;
    const declarationsField = nodeField(rootNode, 'declarations');
    indexDecls(declarationsField ?? rootNode, binds, instances);

    const imports = parseImports(rootNode);
    const parsedModule: ParsedModule = {
      file: absolutePath,
      source,
      tree,
      binds,
      instances,
      imports,
    };

    this.cache.set(absolutePath, parsedModule);
    return parsedModule;
  }
}
