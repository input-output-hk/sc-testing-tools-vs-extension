import * as vscode from 'vscode';
import { getWebviewHtml } from '../utils/webview';

import type { PbtContext } from '../extension';

export default class TestResultView {
  private context: PbtContext;
  private panel: vscode.WebviewPanel | null = null;
  private testResult: TestResultWithGroupTests | null = null;

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
      this.sendTestResultWithGroupTests(testId);
      return;
    }

    // Register the test result view
    this.panel = vscode.window.createWebviewPanel(
      "pbt-test-result",
      "PBT Testing interface",
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
            this.sendTestResultWithGroupTests(testId);
            break;
          case "select-test":
            this.sendTestResult(message.payload.testId);
            break;
          case "run-test":
            this.runTest();
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

  private sendTestResultWithGroupTests(testId: TestId): void {
    this.context.store.testStore.getTestResultWithGroupTests(testId).then(testResult => {
      this.testResult = testResult;
      this.sendTestResultToWebview();
    });
  }

  private sendTestResult(testId: TestId): void {
    this.context.store.testStore.getTestResult(testId).then(testResult => {
      this.testResult = { ...testResult, groupTests: this.testResult?.groupTests || [] };
      this.sendTestResultToWebview();
    });
  }

  private runTest(): void {
    if (this.testResult !== null) {
      this.context.store.testStore.runTests([this.testResult.test.id]);
    }
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