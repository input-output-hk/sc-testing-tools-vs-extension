import * as fs from 'fs';
import * as path from 'path';

export class FollowState {
  public readonly limit: number;
  public opens = 0;
  private visited = new Set<string>();

  constructor(limit: number) {
    this.limit = Number.isFinite(limit) ? limit : 100;
  }

  public hasBudget(): boolean {
    return this.opens < this.limit;
  }

  public spend(): void {
    this.opens += 1;
  }

  public seen(filePath: string, binding: string): boolean {
    return this.visited.has(this.visitKey(filePath, binding));
  }

  public mark(filePath: string, binding: string): void {
    this.visited.add(this.visitKey(filePath, binding));
  }

  private visitKey(filePath: string, binding: string): string {
    return `${filePath}::${binding}`;
  }
}

export function moduleNameToFile(moduleName: string, baseDirs: Array<string>): string | null {
  const relative = `${moduleName.split('.').join(path.sep)}.hs`;
  for (const base of baseDirs) {
    const candidate = path.join(base, relative);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}
