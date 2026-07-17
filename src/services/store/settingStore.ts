import * as vscode from 'vscode';

import type { PbtContext } from '../../extension';

export interface TestSettings {
  mode: ExtensionMode;
  rounds: number;
}

export default class SettingStore {
  private settings: TestSettings = {
    mode: 'docker',
    rounds: 100,
  };

  private modeChangeCallbacks: ((mode: ExtensionMode) => void)[] = [];

  public initialize(context: PbtContext): void {
    this.settings.mode = this.readModeFromConfig();

    const disposable = vscode.workspace.onDidChangeConfiguration((event) => {
      if (!event.affectsConfiguration('pbt-extension.executionMode')) return;

      const mode = this.readModeFromConfig();
      if (mode === this.settings.mode) return;

      this.settings.mode = mode;
      this.notifyModeChange(mode);
    });
    context.extension.subscriptions.push(disposable);
  }

  private readModeFromConfig(): ExtensionMode {
    const mode = vscode.workspace
      .getConfiguration('pbt-extension')
      .get<string>('executionMode', this.settings.mode);

    return mode.toLowerCase() as ExtensionMode;
  }  

  private notifyModeChange(mode: ExtensionMode): void {
    for (const callback of this.modeChangeCallbacks) {
      callback(mode);
    }
  }

  public getSettings(): TestSettings {
    return this.settings;
  }

  public setMode(mode: ExtensionMode): void {
    this.settings.mode = mode;
    vscode.workspace
      .getConfiguration('pbt-extension')
      .update('executionMode', mode, vscode.ConfigurationTarget.Global);
  }

  public setRounds(rounds: number): void {
    this.settings.rounds = rounds;
  }

  public onModeChange(callback: (mode: ExtensionMode) => void): void {
    this.modeChangeCallbacks.push(callback);
  }
}
