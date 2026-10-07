import * as vscode from 'vscode';
import { GenericWebviewViewProvider } from '../utils/webview';

import type { PbtContext } from '../extension';

export default class TestSummaryView {
  private context: PbtContext;
  private webview: vscode.Webview | null = null;
  private testId: TestId | null = null;

  constructor() {
    this.context = {} as PbtContext;
  }

  public activate(context: PbtContext) {
    this.context = context;
    const provider = new GenericWebviewViewProvider(context.extension.extensionUri, 'testSummary', this.onWebviewResolved.bind(this));
    const testSummaryWebviewView = vscode.window.registerWebviewViewProvider('pbt-test-summary', provider);
    context.extension.subscriptions.push(testSummaryWebviewView);

    this.context.store.testStore.onTestTreeUpdate(this.onTestTreeUpdate.bind(this));
    this.context.store.testStore.onTestJobUpdate(this.onTestJobUpdate.bind(this));
  }

  public showTestSummary(testId: TestId): void {
    this.testId = testId;
    this.sendTestSummary();
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
            this.context.testResultView.openRun(message.payload.testId, message.payload.runId, null);
            break;
        }
      },
      undefined,
      this.context.extension.subscriptions
    );
  }

  private onTestTreeUpdate(payload: TestTreeUpdate): void {
    if (payload.type !== 'test') return;
    this.sendTestSummaryHistory();
    if (this.testId !== null && payload.test.id.join(':') === this.testId.join(':')) {
      this.sendTestSummary();
    }
  }

  private onTestJobUpdate(): void {
    this.sendTestSummaryHistory();
  }

  private async sendTestSummaryHistory(): Promise<void> {
    if (this.webview === null) return;

    const testStore = this.context.store.testStore;
    const runs = await testStore.getTestRunsHistory();
    const names: GenericMap<string> = {};
    this.collectTestNames(await testStore.getTestTree(), names);
    this.webview?.postMessage({ type: 'test-summary-history', payload: { runs, names } } as ExtensionToWebviewMessage);
  }

  private collectTestNames(testTree: TestTree, names: GenericMap<string>): void {
    for (const testPackage of Object.values(testTree.packages)) {
      for (const suite of Object.values(testPackage.suites)) {
        this.collectNodeNames(suite.tests, names);
      }
    }
  }

  private collectNodeNames(nodes: TestTreeNodeMap, names: GenericMap<string>): void {
    for (const node of Object.values(nodes)) {
      if (node.type === 'group') {
        this.collectNodeNames((node as TestTreeGroupNode).nodes, names);
      } else {
        const test = (node as TestTreeTestNode).test;
        names[test.id.join(':')] = test.name;
      }
    }
  }

  private sendTestSummary(): void {
    if (this.webview === null || this.testId === null) return;

    this.context.store.testStore.getTestResult(this.testId).then(testResult => {
      if (testResult.test.status === 'undetermined') return;
      this.webview?.postMessage({ type: 'test-summary-details', payload: testResult } as ExtensionToWebviewMessage);
    });
  }
}
