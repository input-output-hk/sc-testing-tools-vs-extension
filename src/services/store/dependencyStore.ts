import { exec } from 'child_process';
import { promisify } from 'util';

import type { PbtContext } from '../../extension';

const execAsync = promisify(exec);

// only checks if dependencies are installed
async function commandExists(command: string): Promise<boolean> {
  try {
    await execAsync(`${command} --version`);
    return true;
  } catch {
    return false;
  }
}

// if docker is installed, check if it is running
// resolves false on timeout so a hung `docker info` call can't block extension load
async function isDockerRunning(timeoutMs = 5000): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => resolve(false), timeoutMs);

    execAsync('docker info')
      .then(() => {
        clearTimeout(timer);
        resolve(true);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(false);
      });
  });
}

export default class DependencyStore {
  private context: PbtContext | null = null;

  private hasNix: boolean = false;
  private hasDocker: boolean = false;
  private dockerRunning: boolean = false;
  private dependencyError: DependencyError = { hasError: false, message: '', code: undefined };
  private dependencyErrorCallbacks: ((error: DependencyError) => void)[] = [];


  public async initialize(context: PbtContext): Promise<void> {
    this.context = context;
    const [hasDocker, hasNix] = await Promise.all([
      commandExists('docker'),
      commandExists('nix'),
    ]);
    const dockerRunning = hasDocker ? await isDockerRunning() : false;

    this.setHasDocker(hasDocker);
    this.setHasNix(hasNix);
    this.setDockerRunning(dockerRunning);
    this.setDependencyError();
  }

  public getHasNix(): boolean {
    return this.hasNix;
  }

  public getDockerRunning(): boolean {
    return this.dockerRunning;
  }

  public getDependencyError(): DependencyError {
    return this.dependencyError;
  }

  // notified whenever the computed dependency error actually changes, regardless of
  // which caller (retry button, mode change, pre-flight check, ...) triggered the recheck
  public onDependencyErrorChange(callback: (error: DependencyError) => void): void {
    this.dependencyErrorCallbacks.push(callback);
  }

  // re-evaluate the dependency error using the already-known install/running state
  // (e.g. after the execution mode changes) without re-running the install checks
  public refreshDependencyError(): void {
    this.setDependencyError();
  }

  // re-check whether Docker is still reachable right now (e.g. right before listing/running
  // tests in docker mode), since it can stop running any time after the initial checks
  public async checkDockerRunning(): Promise<boolean> {
    const dockerRunning = this.hasDocker ? await isDockerRunning() : false;
    this.setDockerRunning(dockerRunning);
    this.setDependencyError();
    return dockerRunning;
  }

  private setHasNix(hasNix: boolean): void {
    if (hasNix === this.hasNix) return;
    this.hasNix = hasNix;
  }

  private setHasDocker(hasDocker: boolean): void {
    if (hasDocker === this.hasDocker) return;
    this.hasDocker = hasDocker;
  }

  private setDockerRunning(dockerRunning: boolean): void {
    if (dockerRunning === this.dockerRunning) return;
    this.dockerRunning = dockerRunning;
  }

  private setDependencyError(): void {
    const dependencyError = this.computeDependencyError();

    const unchanged = dependencyError.hasError === this.dependencyError.hasError
      && dependencyError.code === this.dependencyError.code
      && dependencyError.message === this.dependencyError.message;
    if (unchanged) return;

    this.dependencyError = dependencyError;
    for (const callback of this.dependencyErrorCallbacks) {
      callback(dependencyError);
    }
  }

  private computeDependencyError(): DependencyError {
    if (!this.hasNix && !this.hasDocker) {
      return { hasError: true, message: 'No dependencies were detected. Please ensure that at least one dependency is properly installed so PBT can run.', code: 'no-dependencies' };
    } else if (this.context?.store.settingStore.getSettings().mode === 'docker' && !this.dockerRunning) {
      return { hasError: true, message: 'Problem connecting to Docker.', code: 'docker-connection' };
    } else if (this.context?.store.settingStore.getSettings().mode === "nix" && !this.hasNix) {
      return { hasError: true, message: "Nix not detected.", code: 'nix-not-detected' };
    } else {
      return { hasError: false, message: '', code: undefined };
    }
  }
}