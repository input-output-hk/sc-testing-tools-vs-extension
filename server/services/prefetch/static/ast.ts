type NodeLike = {
  type: string;
  text: string;
  namedChildren: Array<NodeLike>;
  startPosition: { row: number };
  childForFieldName(field: string): NodeLike | null;
};

export function nodeField(node: NodeLike | null, field: string): NodeLike | null {
  return node && typeof node.childForFieldName === 'function' ? node.childForFieldName(field) : null;
}

export function peelApply(node: NodeLike): { head: NodeLike | null; args: Array<NodeLike> } {
  const args: Array<NodeLike> = [];
  let current: NodeLike | null = node;
  while (current !== null && current.type === 'apply') {
    const arg = current.childForFieldName('argument');
    if (arg !== null) {
      args.push(arg);
    }
    current = current.childForFieldName('function');
  }
  args.reverse();
  return { head: current, args };
}

export function headVariableName(node: NodeLike | null): string | null {
  if (node === null) {
    return null;
  }
  if (node.type === 'variable') {
    return node.text;
  }
  if (node.type === 'qualified') {
    const id = node.childForFieldName('id');
    if (id !== null) {
      return id.text;
    }
  }
  return null;
}

export function stripTrailingDot(value: string): string {
  return value.replace(/\.$/, '');
}

export function refTarget(node: NodeLike | null): { name: string; module: string | null } | null {
  if (node === null) {
    return null;
  }

  if (node.type === 'variable') {
    return { name: node.text, module: null };
  }

  if (node.type === 'qualified') {
    const id = node.childForFieldName('id');
    const module = node.childForFieldName('module');
    if (id === null) {
      return null;
    }
    return {
      name: id.text,
      module: module !== null ? stripTrailingDot(module.text) : null,
    };
  }

  if (node.type === 'parens') {
    return refTarget(node.childForFieldName('expression'));
  }

  if (node.type === 'apply') {
    const { head } = peelApply(node);
    return refTarget(head);
  }

  return null;
}

export function stripQuotes(value: string): string {
  if (value.length >= 2 && value[0] === '"' && value[value.length - 1] === '"') {
    return value.slice(1, -1);
  }
  return value;
}

export function stringLiteralText(node: NodeLike | null): string | null {
  if (node === null) {
    return null;
  }
  if (node.type === 'literal') {
    const inner = node.namedChildren.find((child) => child.type === 'string') ?? null;
    return inner !== null ? stripQuotes(inner.text) : null;
  }
  if (node.type === 'string') {
    return stripQuotes(node.text);
  }
  return null;
}

export function typeAppName(node: NodeLike | null): string | null {
  if (node !== null && node.type === 'type_application') {
    const typeNode = node.childForFieldName('type');
    if (typeNode !== null) {
      return typeNode.text.trim();
    }
  }
  return null;
}

export function bindExpression(node: NodeLike | null): NodeLike | null {
  if (node === null) {
    return null;
  }
  const match = node.childForFieldName('match');
  if (match !== null) {
    const expression = match.childForFieldName('expression');
    if (expression !== null) {
      return expression;
    }
  }
  return null;
}

export function findListArg(args: Array<NodeLike>): NodeLike | null {
  return args.find((arg) => arg !== null && arg.type === 'list') ?? null;
}

export function listElements(listNode: NodeLike): Array<NodeLike> {
  return listNode.namedChildren.filter((child) => child.type !== 'comment');
}

export function lineOf(node: NodeLike): number {
  return node.startPosition.row + 1;
}

export function elementLabel(node: NodeLike): string {
  if (node.type === 'apply') {
    const { head, args } = peelApply(node);
    const headName = headVariableName(head) ?? head?.text.trim() ?? '';
    const argTexts = args.map((arg) => arg.text.trim());
    return [headName, ...argTexts].join(' ').trim();
  }
  return node.text.trim();
}

export type { NodeLike };
