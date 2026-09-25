import * as vscode from 'vscode';
import { getWebviewHtml } from '../utils/webview';

import type { PbtContext } from '../extension';

export default class TestResultView {
  private context: PbtContext;
  private panel: vscode.WebviewPanel | null = null;
  private testResult: TestResult | null = null;
  private pendingExpandRoundId: number | null = null;
  private runId: string | null = null;

  constructor() {
    this.context = {} as PbtContext;
  }

  public activate(context: PbtContext) {
    this.context = context;
    this.context.store.testStore.onTestTreeUpdate(this.onTestTreUpdate.bind(this));
  }

  public open(testId: TestId): void {
    this.runId = null;
    this.show(testId);
  }

  public openRun(testId: TestId, runId: string, roundId: number): void {
    this.runId = runId;
    this.pendingExpandRoundId = roundId;
    this.show(testId);
  }

  private show(testId: TestId): void {
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
    const request = this.runId === null
      ? this.context.store.testStore.getTestResult(testId)
      : this.getTestRunResult(testId, this.runId);
    request.then(this.onTestResultLoaded.bind(this));
  }

  private async getTestRunResult(testId: TestId, runId: string): Promise<TestResult> {
    const testStore = this.context.store.testStore;
    const liveTest = (await testStore.getTestResult(testId)).test;
    const rounds = await testStore.getTestRoundsHistory(runId, testId);
    const result = this.findRunTestResult(await testStore.getTestRunsHistory(), runId, testId);

    if (result === undefined) return { test: liveTest, rounds };

    const test: Test = {
      ...liveTest,
      status: result.status,
      time: result.time,
      type: result.type,
      group: result.group,
      isWaiting: false,
      isRunning: false,
    };
    return { test, rounds };
  }

  private findRunTestResult(runs: Array<TestRunHistory>, runId: string, testId: TestId): TestResultHistory | undefined {
    const key = testId.join(':');
    for (const run of runs) {
      if (run.runId !== runId) continue;
      for (const result of run.tests) {
        if (result.id.join(':') === key) return result;
      }
    }
    return undefined;
  }

  private onTestResultLoaded(testResult: TestResult): void {
    this.testResult = testResult;
    this.sendTestResultToWebview();
  }

  private onTestTreUpdate(payload: TestTreeUpdate): void {
    if (payload.type === 'test') {
      const test = payload.test;
      if (
        this.panel !== null &&
        this.testResult !== null &&
        test.id.join(':') === this.testResult.test.id.join(':') &&
        (this.runId === null || this.runId === test.lastRunId) &&
        test.status !== this.testResult.test.status
      ) {
        if (test.status !== "valid" && test.status !== "invalid") {
          this.updateTest(test);
        } else {
          this.updateTestRounds(test);
        }
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

      if (this.pendingExpandRoundId !== null) {
        this.panel!.webview.postMessage({ type: 'test-result-expand-round', payload: { roundId: this.pendingExpandRoundId } } as ExtensionToWebviewMessage);
        this.pendingExpandRoundId = null;
      }
    }
  }
}