import * as vscode from 'vscode';
import { GenericWebviewViewProvider } from '../utils/webview';

import type { PbtContext } from '../extension';

const DEPENDENCY_ERROR_MESSAGE = 'No dependencies were detected. Please ensure that at least one dependency is properly installed so PBT can run.';

export default class TestConfigurationView {
  private context: PbtContext;
  private webview: vscode.Webview | null = null;

  constructor() {
    this.context = {} as PbtContext;
  }

  public activate(context: PbtContext) {
    this.context = context;
    const TestConfigurationProvider = new GenericWebviewViewProvider(context.extension.extensionUri, 'testConfiguration', this.onWebviewResolved.bind(this));
    const TestConfigurationPanel = vscode.window.registerWebviewViewProvider('pbt-test-run-configuration', TestConfigurationProvider);
    context.extension.subscriptions.push(TestConfigurationPanel);

    this.onDependencyError(this.context.store.dependencyStore.getHasError());
  }

  private onWebviewResolved(webview: vscode.Webview): void {
    this.webview = webview;

    this.context.store.settingStore.onModeChange(() => this.sendExecutionModeConfig());

    this.webview.onDidReceiveMessage(
      (message: WebviewToExtensionMessage) => {
        switch (message.type) {
          case 'webview-ready':
            this.sendExecutionModeConfig();
            this.sendDependencyStatus();
            break;
          case 'update-execution-mode':
            this.updateExecutionMode(message.payload.executionMode);
            break;
        }
      },
      undefined,
      this.context.extension.subscriptions
    );
  }

  private sendExecutionModeConfig(): void {
    const executionMode = this.context.store.settingStore.getSettings().mode;

    this.webview?.postMessage({ type: 'execution-mode-config', payload: { executionMode } } as ExtensionToWebviewMessage);
  }

  private updateExecutionMode(executionMode: ExtensionMode): void {
    this.context.store.settingStore.setMode(executionMode);
  }

  private sendDependencyStatus(): void {
    const hasError = this.context.store.dependencyStore.getHasError();
    const hasDocker = this.context.store.dependencyStore.getHasDocker();
    const hasNix = this.context.store.dependencyStore.getHasNix();

    this.webview?.postMessage({ type: 'dependency-status', payload: { hasError, hasDocker, hasNix, message: DEPENDENCY_ERROR_MESSAGE } } as ExtensionToWebviewMessage);
  }

  private onDependencyError(hasError: boolean): void {
    if (hasError) {
      this.context.statusBarItem.text = '$(error) No dependencies detected.';
      this.context.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
      this.context.statusBarItem.show();

      vscode.window.showErrorMessage(DEPENDENCY_ERROR_MESSAGE,
        'Retry',
        'Install Nix',
        'Install Docker'
      ).then((selection) => {
        switch (selection) {
          case 'Retry':
            this.context.store.dependencyStore.initialize().then(() => {
              this.onDependencyError(this.context.store.dependencyStore.getHasError());
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
    } else {
      this.context.statusBarItem.hide();
    }
  }

}