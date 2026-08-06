import * as vscode from 'vscode';
import { getWebviewHtml } from '../utils/webview';

import type { PbtContext } from '../extension';

export default class TestResultView {
  private context: PbtContext;
  private panel: vscode.WebviewPanel | null = null;

  constructor() {
    this.context = {} as PbtContext;
  }

  public activate(context: PbtContext) {
    this.context = context;
  }

  public open(testResult: TestResult): void {
    // If webview panel is already open
    if (this.panel !== null) {
      this.panel.reveal();
      this.sendTestResultToWebview(testResult);
      return;
    }

    // Register the test result view
    this.panel = vscode.window.createWebviewPanel(
      "pbt-test-result",
      "Test Result",
      vscode.ViewColumn.Two,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [this.context.extension.extensionUri],
      },
    );

    this.panel.iconPath = vscode.Uri.joinPath(
      this.context.extension.extensionUri,
      "images",
      "pbt-logo.svg",
    );

    // Listen for messages from the webview
    this.panel.webview.onDidReceiveMessage(
      (message: WebviewToExtensionMessage) => {
        switch (message.type) {
          case "webview-ready":
            this.sendTestResultToWebview(testResult);
            break;
        }
      },
      undefined,
      this.context.extension.subscriptions,
    );

    this.panel.webview.html = getWebviewHtml(
      this.panel.webview,
      this.context.extension.extensionUri,
      "testResult",
    );
    this.panel.onDidDispose(
      () => (this.panel = null),
      null,
      this.context.extension.subscriptions,
    );
  }

  private sendTestResultToWebview(testResult: TestResult): void {
    if (this.panel !== null) {
      this.panel.webview.postMessage({ type: 'test-result', payload: testResult } as ExtensionToWebviewMessage);
    }
  }
}