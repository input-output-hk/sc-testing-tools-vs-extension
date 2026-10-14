import * as vscode from 'vscode';
import { GenericWebviewViewProvider } from '../utils/webview';

import type { PbtContext } from '../extension';

export default class TestSummaryView {
  private context: PbtContext;
  private webview: vscode.Webview | null = null;
  private testId: TestId | null = null;
  private runId: string | null = null;

  constructor() {
    this.context = {} as PbtContext;
  }

  public activate(context: PbtContext) {
    this.context = context;
    const provider = new GenericWebviewViewProvider(context.extension.extensionUri, 'testSummary', this.onWebviewResolved.bind(this));
    const testSummaryWebviewView = vscode.window.registerWebviewViewProvider('pbt-test-summary', provider);
    context.extension.subscriptions.push(testSummaryWebviewView);

    const clearHistoryCommand = vscode.commands.registerCommand('pbt-extension.clearTestRunsHistory', this.clearTestRunsHistory.bind(this));
    context.extension.subscriptions.push(clearHistoryCommand);

    this.context.store.testStore.onTestTreeUpdate(this.onTestTreeUpdate.bind(this));
    this.context.store.testStore.onTestJobUpdate(this.onTestJobUpdate.bind(this));
  }

  public showTestSummary(testId: TestId): void {
    this.testId = testId;
    this.runId = null;
    this.sendTestSummary();
    vscode.commands.executeCommand('pbt-test-summary.focus');
  }

  private async clearTestRunsHistory(): Promise<void> {
    await vscode.commands.executeCommand('pbt-extension.clearAllTestsResults');
    this.testId = null;
    this.runId = null;
    this.webview?.postMessage({ type: 'test-summary-clear' } as ExtensionToWebviewMessage);
    this.sendTestSummaryHistory();
  }

  private onWebviewResolved(webview: vscode.Webview): void {
    this.webview = webview;

    this.webview.onDidReceiveMessage(
      (message: WebviewToExtensionMessage) => {
        switch (message.type) {
          case 'webview-ready':
            this.sendTestSummary();
            this.sendTestSummaryHistory();
            break;
          case 'test-summary-open-round':
            this.context.testResultView.openRun(message.payload.testId, message.payload.runId, message.payload.roundId);
            break;
          case 'test-summary-open-test':
            this.openTest(message.payload.testId, message.payload.runId);
            break;
        }
      },
      undefined,
      this.context.extension.subscriptions
    );
  }

  private async openTest(testId: TestId, runId: string): Promise<void> {
    this.testId = testId;
    this.runId = runId;
    this.sendTestSummary();
    const testResult = await this.context.testResultView.getTestRunResult(testId, runId);
    if (testResult.test.type === 'unit-test') return;
    this.context.testResultView.openRun(testId, runId, null);
  }

  private onTestTreeUpdate(payload: TestTreeUpdate): void {
    if (payload.type !== 'test') return;
    this.sendTestSummaryHistory();
    if (
      this.testId !== null &&
      payload.test.id.join(':') === this.testId.join(':') &&
      (this.runId === null || this.runId === payload.test.lastRunId)
    ) {
      this.sendTestSummary();
    }
  }

  private onTestJobUpdate(job: TestJob | null): void {
    this.sendTestSummaryHistory();
    if (job !== null && job.type === 'run' && (job.status === 'success' || job.status === 'failed')) {
      vscode.commands.executeCommand('pbt-test-summary.focus');
    }
  }

  private async sendTestSummaryHistory(): Promise<void> {
    if (this.webview === null) return;

    const testStore = this.context.store.testStore;
    const runs = await testStore.getTestRunsHistory();
    const names: GenericMap<string> = {};
    const live: GenericMap<RunStatusContext> = {};
    this.collectTestNames(await testStore.getTestTree(), names, live);
    this.webview?.postMessage({ type: 'test-summary-history', payload: { runs, names, live, activeRunId: testStore.getActiveHistoryRunId() } } as ExtensionToWebviewMessage);
  }

  private collectTestNames(testTree: TestTree, names: GenericMap<string>, live: GenericMap<RunStatusContext>): void {
    for (const testPackage of Object.values(testTree.packages)) {
      for (const suite of Object.values(testPackage.suites)) {
        this.collectNodeNames(suite.tests, names, live);
      }
    }
  }

  private collectNodeNames(nodes: TestTreeNodeMap, names: GenericMap<string>, live: GenericMap<RunStatusContext>): void {
    for (const node of Object.values(nodes)) {
      if (node.type === 'group') {
        this.collectNodeNames((node as TestTreeGroupNode).nodes, names, live);
      } else {
        const test = (node as TestTreeTestNode).test;
        const key = test.id.join(':');
        names[key] = test.name;
        live[key] = { status: test.status, isWaiting: test.isWaiting, isBuilding: test.isBuilding, isRunning: test.isRunning };
      }
    }
  }

  private async sendTestSummary(): Promise<void> {
    if (this.webview === null || this.testId === null) return;

    const runId = this.runId;
    const testResult = runId === null
      ? await this.context.store.testStore.getTestResult(this.testId)
      : await this.context.testResultView.getTestRunResult(this.testId, runId);
    if (testResult.test.status === 'undetermined') return;
    const previousRunStartedOn = await this.context.testResultView.getPreviousRunStartedOn(runId);
    this.webview?.postMessage({ type: 'test-summary-details', payload: { testResult, runId, previousRunStartedOn } } as ExtensionToWebviewMessage);
  }
}
