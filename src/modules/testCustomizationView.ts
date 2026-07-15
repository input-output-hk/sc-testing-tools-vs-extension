import * as vscode from 'vscode';
import { GenericWebviewViewProvider } from '../utils/webview';

import type { PbtContext } from '../extension';

export default class TestCustomizationView {
  private context: PbtContext;
  private webview: vscode.Webview | null = null;

  constructor() {
    this.context = {} as PbtContext;
  }

  public activate(context: PbtContext) {
    this.context = context;
    const testCustomizationProvider = new GenericWebviewViewProvider(context.extension.extensionUri, 'testCustomization', this.onWebviewResolved.bind(this));
    const testCustomizationPanel = vscode.window.registerWebviewViewProvider('pbt-test-customization', testCustomizationProvider);
    context.extension.subscriptions.push(testCustomizationPanel);
  }

  private onWebviewResolved(webview: vscode.Webview): void {
    this.webview = webview;

    this.context.store.settingStore.onModeChange(() => this.sendExecutionModeConfig());

    this.webview.onDidReceiveMessage(
      (message: WebviewToExtensionMessage) => {
        switch (message.type) {
          case 'webview-ready':
            this.sendExecutionModeConfig();
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

}