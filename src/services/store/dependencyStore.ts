import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function commandExists(command: string): Promise<boolean> {
  try {
    await execAsync(`${command} --version`);
    return true;
  } catch {
    return false;
  }
}

export default class DependencyStore {
  private hasError: boolean = false;

  public async initialize(): Promise<void> {
    const [hasDocker, hasNix] = await Promise.all([
      commandExists('docker'),
      commandExists('nix'),
    ]);

    this.setHasError(!hasDocker && !hasNix);
  }

  public getHasError(): boolean {
    return this.hasError;
  }

  private setHasError(hasError: boolean): void {
    if (hasError === this.hasError) return;
    this.hasError = hasError;
  }
}
