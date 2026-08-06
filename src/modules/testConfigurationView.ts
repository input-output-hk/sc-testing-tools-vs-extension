import * as vscode from 'vscode';
import { GenericWebviewViewProvider } from '../utils/webview';

import type { PbtContext } from '../extension';

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
    const TestConfigurationPanel = vscode.window.registerWebviewViewProvider('pbt-test-configuration', TestConfigurationProvider);
    // add the webview view provider to the extension context subscriptions
    context.extension.subscriptions.push(TestConfigurationPanel);

    // any dependency recheck, no matter who triggers it (this view, a "Retry" click, or a
    // pre-flight check from testTreeView before listing/running tests) flows back through
    // here so the status bar and this webview always reflect the latest state
    this.context.store.dependencyStore.onDependencyErrorChange((error) => {
      this.onDependencyError(error);
      this.sendDependencyStatus();
    });

    // title-bar refresh button (view/title menu) so a user can re-check dependencies
    // without reloading the whole extension after fixing a Docker/Nix problem
    const refreshCommand = vscode.commands.registerCommand('pbt-extension.refreshTestConfiguration', () => this.refresh());
    context.extension.subscriptions.push(refreshCommand);
  }

  // fully re-checks dependency install/running state (same as the error notification's
  // "Retry" action); onDependencyErrorChange pushes the result to the status bar/webview
  private refresh(): void {
    this.context.store.dependencyStore.initialize(this.context);
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
            // only surface the status bar item/error notification once the user has opened this view
            this.onDependencyError(this.context.store.dependencyStore.getDependencyError());
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

  // re-evaluate the dependency error against the current execution mode;
  // onDependencyErrorChange pushes the result to the status bar/webview if it changed
  private checkDependencyStatus(): void {
    this.context.store.dependencyStore.refreshDependencyError();
  }

  // update the test rounds in the setting store when the user changes it in the webview
  private updateTestRounds(rounds: number): void {
    this.context.store.settingStore.setRounds(rounds);
  }

  // send the current dependency status to the webview
  private sendDependencyStatus(): void {
    const error = this.context.store.dependencyStore.getDependencyError();

    this.webview?.postMessage({ type: 'dependency-status', payload: { error } } as ExtensionToWebviewMessage);
  }

  private onDependencyError({ hasError, message, code }: DependencyError): void {
    // Update the status bar and show error notification if no dependencies are installed
    if (hasError && code === 'no-dependencies') {
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
            this.refresh();
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
    else if (hasError && code === 'docker-connection') {
      this.context.statusBarItem.text = '$(error) Problem with Docker connection';
      this.context.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
      this.context.statusBarItem.show();
    } else if (hasError && code === 'nix-not-detected') {
      this.context.statusBarItem.text = '$(error) Nix not detected';
      this.context.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
      this.context.statusBarItem.show();
    } else {
      this.context.statusBarItem.hide();
    }
  }

}