import * as vscode from 'vscode';

import type { PbtContext } from '../../extension';

export interface TestSettings {
  mode: ExtensionMode;
  rounds: number;
}

// Matches the default of VS Code's built-in `testing.coverageBarThresholds`.
const DEFAULT_COVERAGE_BAR_THRESHOLDS: CoverageBarThresholds = { red: 0, yellow: 60, green: 90 };

export default class SettingStore {
  private settings: TestSettings = {
    mode: 'docker',
    rounds: 100,
  };

  private modeChangeCallbacks: ((mode: ExtensionMode) => void)[] = [];
  private coverageBarThresholdsChangeCallbacks: ((thresholds: CoverageBarThresholds) => void)[] = [];
  // Set right before we write our own mode change to config, so the resulting
  // onDidChangeConfiguration event (our own echo) doesn't get mistaken for an
  // external change and bounce the in-memory mode back to whatever the config
  // happens to resolve to (e.g. a workspace-level override taking precedence
  // over our Global write).
  private suppressNextConfigChange = false;

  public initialize(context: PbtContext): void {
    this.settings.mode = this.readModeFromConfig();

    const disposable = vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('testing.coverageBarThresholds')) {
        this.notifyCoverageBarThresholdsChange(this.getCoverageBarThresholds());
      }

      if (!event.affectsConfiguration('pbt-extension.executionMode')) return;

      if (this.suppressNextConfigChange) {
        this.suppressNextConfigChange = false;
        return;
      }

      const mode = this.readModeFromConfig();
      if (mode === this.settings.mode) return;

      this.settings.mode = mode;
      this.notifyModeChange(mode);
    });
    context.extension.subscriptions.push(disposable);
  }

  // VS Code does not merge per-property defaults into object settings, so a
  // user who overrides only one colour would otherwise leave the rest missing.
  public getCoverageBarThresholds(): CoverageBarThresholds {
    const thresholds = vscode.workspace
      .getConfiguration('testing')
      .get<Partial<CoverageBarThresholds>>('coverageBarThresholds', {});

    return { ...DEFAULT_COVERAGE_BAR_THRESHOLDS, ...thresholds };
  }

  public onCoverageBarThresholdsChange(callback: (thresholds: CoverageBarThresholds) => void): void {
    this.coverageBarThresholdsChangeCallbacks.push(callback);
  }

  private notifyCoverageBarThresholdsChange(thresholds: CoverageBarThresholds): void {
    for (const callback of this.coverageBarThresholdsChangeCallbacks) {
      callback(thresholds);
    }
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

  public setMode(mode: ExtensionMode): void {
    this.settings.mode = mode;
    this.suppressNextConfigChange = true;
    vscode.workspace
      .getConfiguration('pbt-extension')
      .update('executionMode', mode, vscode.ConfigurationTarget.Global);
  }

  public onModeChange(callback: (mode: ExtensionMode) => void): void {
    this.modeChangeCallbacks.push(callback);
  }

  public getSettings(): TestSettings {
    return this.settings;
  }  

  public setRounds(rounds: number): void {
    this.settings.rounds = rounds;
  } 
}