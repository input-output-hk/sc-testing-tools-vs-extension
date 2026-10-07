import * as vscode from 'vscode';
import { BehaviorSubject, type Subscription } from 'rxjs';

import type { PbtContext } from '../../extension';

export interface TestSettings {
  mode: ExtensionMode;
  rounds: number;
}

// Matches the default of VS Code's built-in `testing.coverageBarThresholds`.
const DEFAULT_COVERAGE_BAR_THRESHOLDS: CoverageBarThresholds = { red: 0, yellow: 60, green: 90 };

export default class SettingStore {
  private mode = new BehaviorSubject<ExtensionMode>('docker');
  private coverageBarThresholds = new BehaviorSubject<CoverageBarThresholds>(DEFAULT_COVERAGE_BAR_THRESHOLDS);
  private rounds: number = 100;

  // Set right before we write our own mode change to config, so the resulting
  // onDidChangeConfiguration event (our own echo) doesn't get mistaken for an
  // external change and bounce the in-memory mode back to whatever the config
  // happens to resolve to (e.g. a workspace-level override taking precedence
  // over our Global write).
  private suppressNextConfigChange = false;

  public initialize(context: PbtContext): void {
    this.mode.next(this.readModeFromConfig());
    this.coverageBarThresholds.next(this.readCoverageBarThresholdsFromConfig());

    const disposable = vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('testing.coverageBarThresholds')) {
        this.coverageBarThresholds.next(this.readCoverageBarThresholdsFromConfig());
      }

      if (!event.affectsConfiguration('pbt-extension.executionMode')) return;

      if (this.suppressNextConfigChange) {
        this.suppressNextConfigChange = false;
        return;
      }

      const mode = this.readModeFromConfig();
      if (mode === this.mode.getValue()) return;

      this.mode.next(mode);
    });
    context.extension.subscriptions.push(disposable);
  }

  private readModeFromConfig(): ExtensionMode {
    const mode = vscode.workspace
      .getConfiguration('pbt-extension')
      .get<string>('executionMode', this.mode.getValue());

    return mode.toLowerCase() as ExtensionMode;
  }

  // VS Code does not merge per-property defaults into object settings, so a
  // user who overrides only one colour would otherwise leave the rest missing.
  private readCoverageBarThresholdsFromConfig(): CoverageBarThresholds {
    const thresholds = vscode.workspace
      .getConfiguration('testing')
      .get<Partial<CoverageBarThresholds>>('coverageBarThresholds', {});

    return { ...DEFAULT_COVERAGE_BAR_THRESHOLDS, ...thresholds };
  }

  public setMode(mode: ExtensionMode): void {
    this.suppressNextConfigChange = true;
    this.mode.next(mode);
    vscode.workspace
      .getConfiguration('pbt-extension')
      .update('executionMode', mode, vscode.ConfigurationTarget.Global);
  }

  // Returns the subscription so a caller whose lifetime is shorter than the
  // store's (a webview view, which VS Code disposes and re-resolves) can drop it.
  public onModeChange(callback: (mode: ExtensionMode) => void): Subscription {
    return this.mode.subscribe(callback);
  }

  public getCoverageBarThresholds(): CoverageBarThresholds {
    return this.coverageBarThresholds.getValue();
  }

  public onCoverageBarThresholdsChange(callback: (thresholds: CoverageBarThresholds) => void): Subscription {
    return this.coverageBarThresholds.subscribe(callback);
  }

  public getSettings(): TestSettings {
    return { mode: this.mode.getValue(), rounds: this.rounds };
  }

  public setRounds(rounds: number): void {
    this.rounds = rounds;
  }
}
