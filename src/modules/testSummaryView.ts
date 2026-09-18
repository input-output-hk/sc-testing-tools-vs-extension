import * as vscode from 'vscode';
import { GenericWebviewViewProvider } from '../utils/webview';

import type { PbtContext } from '../extension';

export default class TestSummaryView {
  private context: PbtContext;
  private webview: vscode.Webview | null = null;
  private testId: TestId | null = null;
  private testName: string | null = null;

  constructor() {
    this.context = {} as PbtContext;
  }

  public activate(context: PbtContext) {
    this.context = context;
    const provider = new GenericWebviewViewProvider(context.extension.extensionUri, 'testSummary', this.onWebviewResolved.bind(this));
    const testSummaryWebviewView = vscode.window.registerWebviewViewProvider('pbt-test-summary', provider);
    context.extension.subscriptions.push(testSummaryWebviewView);

    this.context.store.testStore.onTestTreeUpdate(this.onTestTreeUpdate.bind(this));
  }

  public showTestSummary(testId: TestId, testName: string): void {
    this.testId = testId;
    this.testName = testName;
    this.sendTestSummary();
  }

  private onWebviewResolved(webview: vscode.Webview): void {
    this.webview = webview;

    this.webview.onDidReceiveMessage(
      (message: WebviewToExtensionMessage) => {
        switch (message.type) {
          case 'webview-ready':
            this.sendTestSummary();
            break;
          case 'test-summary-open-round':
            if (this.testId !== null) {
              this.context.testResultView.expandRound(this.testId, message.payload.roundId);
            }
            break;
        }
      },
      undefined,
      this.context.extension.subscriptions
    );
  }

  private onTestTreeUpdate(payload: TestTreeUpdate): void {
    if (payload.type === 'test' && this.testId !== null && payload.test.id.join(':') === this.testId.join(':')) {
      this.sendTestSummary();
    }
  }

  private sendTestSummary(): void {
    if (this.webview === null || this.testId === null || this.testName === null) return;

    this.context.store.testStore.getTestSummary(this.testId).then(summary => {
      if (summary !== undefined) {
        const summaryDetails: TestSummaryDetails = { testName: this.testName!, ...summary };
        this.webview?.postMessage({ type: 'test-summary-details', payload: { summaryDetails } } as ExtensionToWebviewMessage);
      }
    });
  }
}
