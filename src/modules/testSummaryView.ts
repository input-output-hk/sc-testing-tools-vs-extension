import * as vscode from 'vscode';
import { GenericWebviewViewProvider } from '../utils/webview';

import type { PbtContext } from '../extension';

export default class TestSummaryView {
  private context: PbtContext;
  private webview: vscode.Webview | null = null;

  constructor() {
    this.context = {} as PbtContext;
  }

  public activate(context: PbtContext) {
    this.context = context;
    const TestSummaryProvider = new GenericWebviewViewProvider(context.extension.extensionUri, 'testSummary', this.onWebviewResolved.bind(this));
    const TestSummaryWebviewView = vscode.window.registerWebviewViewProvider('pbt-test-summary', TestSummaryProvider);
    context.extension.subscriptions.push(TestSummaryWebviewView);
  }

  private onWebviewResolved(webview: vscode.Webview): void {
    this.webview = webview;

    this.webview.onDidReceiveMessage(
      (message: WebviewToExtensionMessage) => {
        switch (message.type) {
            case 'webview-ready':
                this.sendTestSummaryDetails();
            break;
            // case 'open-round-webview':
            //     // Send a message to the extension to open the round webview with the provided identifier
            // break;
        }
      },
      undefined,
      this.context.extension.subscriptions
    );
  }

  private sendTestSummaryDetails(): void {
    console.log('Sending test summary details');
  }
}