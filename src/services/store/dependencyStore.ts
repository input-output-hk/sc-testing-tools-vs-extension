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
  private hasNix: boolean = false;
  private hasDocker: boolean = false;
  private hasError: boolean = false;

  public async initialize(): Promise<void> {
    const [hasDocker, hasNix] = await Promise.all([
      commandExists('docker'),
      commandExists('nix'),
    ]);

    this.setHasDocker(hasDocker);
    this.setHasNix(hasNix);
    this.setHasError(!hasDocker && !hasNix);
  }

  public getHasDocker(): boolean {
    return this.hasDocker;
  }

  public getHasNix(): boolean {
    return this.hasNix;
  }

  public getHasError(): boolean {
    return this.hasError;
  }

  private setHasDocker(hasDocker: boolean): void {
    if (hasDocker === this.hasDocker) return;
    this.hasDocker = hasDocker;
  }

  private setHasNix(hasNix: boolean): void {
    if (hasNix === this.hasNix) return;
    this.hasNix = hasNix;
  }

  private setHasError(hasError: boolean): void {
    if (hasError === this.hasError) return;
    this.hasError = hasError;
  }
}
