import * as vscode from 'vscode';
import { GenericWebviewViewProvider } from '../utils/webview';

import type { PbtContext } from '../extension';
import { error } from 'console';

export default class TestConfigurationView {
  private context: PbtContext;
  private webview: vscode.Webview | null = null;

  constructor() {
    this.context = {} as PbtContext;
  }

  public activate(context: PbtContext) {
    this.context = context;
    // create a webview view provider for the test configuration panel
    const TestConfigurationProvider = new GenericWebviewViewProvider(context.extension.extensionUri, 'testConfiguration', this.onWebviewResolved.bind(this));
    // register the webview view provider with the extension context
    const TestConfigurationPanel = vscode.window.registerWebviewViewProvider('pbt-test-run-configuration', TestConfigurationProvider);
    // add the webview view provider to the extension context subscriptions
    context.extension.subscriptions.push(TestConfigurationPanel);
    // listen for dependency errors and update the status bar and error notification accordingly
    this.onDependencyError(this.context.store.dependencyStore.getDependencyError());
  }

  private onWebviewResolved(webview: vscode.Webview): void {
    this.webview = webview;

    this.context.store.settingStore.onModeChange(() => {
      this.sendExecutionModeConfig();
      this.checkDependencyStatus();
    });

    this.webview.onDidReceiveMessage(
      (message: WebviewToExtensionMessage) => {
        switch (message.type) {
          case 'webview-ready':
            this.sendExecutionModeConfig();
            this.sendTestRoundsConfig();
            this.sendDependencyStatus();
            break;
          case 'update-execution-mode':
            this.updateExecutionMode(message.payload.executionMode);
            break;
          case 'update-test-rounds':
            this.updateTestRounds(message.payload.rounds);
            break;
        }
      },
      undefined,
      this.context.extension.subscriptions
    );
  }

  // send the current execution mode to the webview
  private sendExecutionModeConfig(): void {
    const executionMode = this.context.store.settingStore.getSettings().mode;

    this.webview?.postMessage({ type: 'execution-mode-config', payload: { executionMode } } as ExtensionToWebviewMessage);
  }

  // send the current test rounds to the webview
  private sendTestRoundsConfig(): void {
    const rounds = this.context.store.settingStore.getSettings().rounds;

    this.webview?.postMessage({ type: 'test-rounds-config', payload: { rounds } } as ExtensionToWebviewMessage);
  }

  // update the execution mode in the setting store when the user changes it in the webview
  private updateExecutionMode(executionMode: ExtensionMode): void {
    this.context.store.settingStore.setMode(executionMode);
    this.checkDependencyStatus();
  }

  // re-evaluate the dependency error against the current execution mode and notify the webview/status bar
  private checkDependencyStatus(): void {
    this.context.store.dependencyStore.refreshDependencyError();
    this.onDependencyError(this.context.store.dependencyStore.getDependencyError());
    this.sendDependencyStatus();
  }

  // update the test rounds in the setting store when the user changes it in the webview
  private updateTestRounds(rounds: number): void {
    this.context.store.settingStore.setRounds(rounds);
  }

  // send the current dependency status to the webview
  private sendDependencyStatus(): void {
    const { hasError, message, code } = this.context.store.dependencyStore.getDependencyError();

    this.webview?.postMessage({ type: 'dependency-status', payload: { error: { hasError, message, code } } } as ExtensionToWebviewMessage);
  }

  private onDependencyError({ hasError, message, code }: DependencyError): void {
    // Update the status bar and show error notification if no dependencies are installed
    if (hasError && code === 1) {
      this.context.statusBarItem.text = '$(error) No dependencies detected.';
      this.context.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
      this.context.statusBarItem.show();

      vscode.window.showErrorMessage(message,
        'Retry',
        'Install Nix',
        'Install Docker'
      ).then((selection) => {
        switch (selection) {
          case 'Retry':
            this.context.store.dependencyStore.initialize(this.context).then(() => {
              this.onDependencyError(this.context.store.dependencyStore.getDependencyError());
              this.sendDependencyStatus();
            });
            break;
          case 'Install Nix':
            vscode.env.openExternal(vscode.Uri.parse('https://nixos.org/download/'));
            break;
          case 'Install Docker':
            vscode.env.openExternal(vscode.Uri.parse('https://www.docker.com/'));
            break;
        }
      });
    } 
    // Update the status bar and show error notification if Docker is installed but not running
    else if (hasError && code === 2) {
      this.context.statusBarItem.text = '$(error) Problem with Docker connection';
      this.context.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
      this.context.statusBarItem.tooltip = message;
      this.context.statusBarItem.show();
    } else {
      this.context.statusBarItem.hide();
    }
  }

}