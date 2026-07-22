import * as vscode from 'vscode';

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
async function isDockerRunning(): Promise<boolean> {
  try {
    await execAsync('docker info');
    return true;
  } catch {
    return false;
  }
}

//TODO: validate if we can us a fn call to detect if Nix is running properly

export default class DependencyStore {
  private context: PbtContext | null = null;

  private hasNix: boolean = false;
  private hasDocker: boolean = false;
  private dockerRunning: boolean = false;
  private dependencyError: DependencyError = { hasError: false, message: '', code: undefined };


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

  // re-evaluate the dependency error using the already-known install/running state
  // (e.g. after the execution mode changes) without re-running the install checks
  public refreshDependencyError(): void {
    this.setDependencyError();
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
    console.log(`DependencyStore: hasNix=${this.hasNix}, hasDocker=${this.hasDocker}, dockerRunning=${this.dockerRunning}`);
    if (!this.hasNix && !this.hasDocker) {
      this.dependencyError = { hasError: true, message: 'No dependencies were detected. Please ensure that at least one dependency is properly installed so PBT can run.', code: 1 };
      return;
    } else if (this.context?.store.settingStore.getSettings().mode === 'docker' && !this.dockerRunning) {
      this.dependencyError = { hasError: true, message: 'Problem connecting to Docker. Check that Docker is running properly and restart the extension or switch to a different execution mode.', code: 2 };
      return;
    } else {
      this.dependencyError = { hasError: false, message: '', code: undefined };
    }
  }
}
