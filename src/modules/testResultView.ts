import * as vscode from 'vscode';
import { getWebviewHtml } from '../utils/webview';

import type { PbtContext } from '../extension';

export default class TestResultView {
  private context: PbtContext;
  private panel: vscode.WebviewPanel | null = null;
  private currentTestId: string | null = null;

  constructor() {
    this.context = {} as PbtContext;
  }

  public activate(context: PbtContext) {
    this.context = context;
    context.testStore.onTestUpdate((test: Test) => {
      if (this.currentTestId === test.id) {
        this.sendTestResultToWebview();
      }
    });
  }

  private sendTestResultToWebview(): void {
    if (this.panel === null || this.currentTestId === null) return;
    const result = this.context.testStore.getTestResult(this.currentTestId);
    const tests = this.context.testStore.getTestPackages()?.tests || {};
    this.panel.webview.postMessage({ type: 'test-result', payload: { result, tests } } as ExtensionToWebviewMessage);
  }

  private recheckCurrentTest(): void {
    if (this.currentTestId === null) return;
    const [packageName, suiteName, id] = this.currentTestId.split(':');
    const workspacePath = this.context.testStore.getTestPackages()?.packages[packageName]?.path;
    if (workspacePath !== undefined) {
      this.context.testStore.runTests(workspacePath, packageName, suiteName, [Number(id)]);
    }
  }

  public open(testId: string): void {
    this.currentTestId = testId;

    if (this.panel !== null) {
      this.panel.reveal();
      this.sendTestResultToWebview();
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      'pbt-test-result',
      'Test Result',
      vscode.ViewColumn.Two,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [this.context.extension.extensionUri],
      }
    );

    this.panel.iconPath = vscode.Uri.joinPath(this.context.extension.extensionUri, 'images', 'pbt-logo.svg');

    this.panel.webview.onDidReceiveMessage(
      (message: WebviewToExtensionMessage) => {
        switch (message.type) {
          case 'webview-ready':
            this.sendTestResultToWebview();
            break;
          case 'open-test-result':
            this.currentTestId = message.payload.testId;
            this.sendTestResultToWebview();
            break;
          case 'run-tests':
            this.recheckCurrentTest();
            break;
        }
      },
      undefined,
      this.context.extension.subscriptions
    );

    this.panel.webview.html = getWebviewHtml(this.panel.webview, this.context.extension.extensionUri, 'testResult');
    this.panel.onDidDispose(() => this.panel = null, null, this.context.extension.subscriptions);
  }
}
