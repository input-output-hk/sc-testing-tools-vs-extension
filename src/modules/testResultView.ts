import * as vscode from 'vscode';
import { getWebviewHtml } from '../utils/webview';

import type { PbtContext } from '../extension';

export default class TestResultView {
  private context: PbtContext;
  private panel: vscode.WebviewPanel | null = null;
  private testResult: TestResult | null = null;

  constructor() {
    this.context = {} as PbtContext;
  }

  public activate(context: PbtContext) {
    this.context = context;
    this.context.store.testStore.onTestUpdate(this.onTestUpdate.bind(this));
  }

  public open(testId: TestId): void {
    // If webview panel is already open
    if (this.panel !== null) {
      this.panel.reveal();
      this.sendTestResult(testId);
      return;
    }

    // Register the test result view
    this.panel = vscode.window.createWebviewPanel(
      "pbt-test-result",
      "PBT Test Results View",
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
            this.sendTestResult(testId);
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

  private sendTestResult(testId: TestId): void {
    this.context.store.testStore.getTestResult(testId).then(testResult => {
      this.testResult = testResult;
      this.sendTestResultToWebview();
    });
  }

  private onTestUpdate(test: Test): void {
    if (
      this.panel !== null &&
      this.testResult !== null &&
      test.id.join(':') === this.testResult.test.id.join(':') &&
      test.status !== this.testResult.test.status
    ) {
      if (test.status !== "valid" && test.status !== "invalid") {
        this.updateTest(test);
      } else {
        this.updateTestRounds(test);
      }
    }
  }

  private updateTest(test: Test): void {
    this.testResult!.test = test;
    this.sendTestResultToWebview();
  }

  private updateTestRounds(test: Test): void {
    this.context.store.testStore.getTestRounds(test.id).then(testRounds => {
      this.testResult!.test = test;
      this.testResult!.rounds = testRounds;
      this.sendTestResultToWebview();
    });
  }

  private sendTestResultToWebview(): void {
    if (this.panel !== null) {
      this.panel!.webview.postMessage({ type: 'test-result', payload: this.testResult } as ExtensionToWebviewMessage);
    }
  }
}