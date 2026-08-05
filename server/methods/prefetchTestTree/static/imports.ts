import { nodeField, type NodeLike } from './ast';

export class ImportTable {
  public modules = new Set<string>();
  public aliases = new Map<string, string>();
  public unqualified = new Map<string, string>();
  public openModules: Array<string> = [];

  public resolveModule(refModule: string | null): string | null {
    if (refModule === null) {
      return null;
    }
    if (this.aliases.has(refModule)) {
      return this.aliases.get(refModule) ?? null;
    }
    if (this.modules.has(refModule)) {
      return refModule;
    }
    return refModule;
  }

  public candidateModulesFor(name: string): Array<string> {
    const result: Array<string> = [];
    if (this.unqualified.has(name)) {
      result.push(this.unqualified.get(name)!);
    }
    for (const moduleName of this.openModules) {
      if (!result.includes(moduleName)) {
        result.push(moduleName);
      }
    }
    return result;
  }
}

export function parseImports(rootNode: NodeLike | null): ImportTable {
  const table = new ImportTable();
  if (rootNode === null) {
    return table;
  }

  const walk = (node: NodeLike): void => {
    if (node.type === 'import') {
      const moduleNode = nodeField(node, 'module');
      const aliasNode = nodeField(node, 'alias');
      const namesNode = nodeField(node, 'names');

      if (moduleNode !== null) {
        const moduleName = moduleNode.text.trim();
        table.modules.add(moduleName);

        if (aliasNode !== null) {
          table.aliases.set(aliasNode.text.trim(), moduleName);
        }

        if (namesNode !== null) {
          for (const importName of namesNode.namedChildren) {
            if (importName.type !== 'import_name') {
              continue;
            }
            const variableNode = importName.childForFieldName('variable');
            if (variableNode !== null) {
              table.unqualified.set(variableNode.text.trim(), moduleName);
            }
          }
          table.openModules.push(moduleName);
        } else {
          table.openModules.push(moduleName);
        }
      }

      return;
    }

    for (const child of node.namedChildren) {
      walk(child);
    }
  };

  walk(rootNode);
  return table;
}
