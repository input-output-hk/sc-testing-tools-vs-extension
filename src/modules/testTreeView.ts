import * as vscode from 'vscode';
import { getWebviewHtml } from '../utils/webview';

import type { PbtContext } from '../extension';

class TestTreeViewProvider implements vscode.WebviewViewProvider {
  private extensionUri: vscode.Uri;
  private onResolve: (webview: vscode.Webview) => void;

  constructor(extensionUri: vscode.Uri, onResolve: (webview: vscode.Webview) => void) {
    this.extensionUri = extensionUri;
    this.onResolve = onResolve;
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    token: vscode.CancellationToken
  ) {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    webviewView.webview.html = getWebviewHtml(webviewView.webview, this.extensionUri, 'testTree');

    this.onResolve(webviewView.webview);
  }
}

export default class TestTreeView {
  private context: PbtContext;
  private webview: vscode.Webview | null = null;

  constructor() {
    this.context = {} as PbtContext;
  }

  public activate(context: PbtContext) {
    this.context = context;
    const provider = new TestTreeViewProvider(context.extension.extensionUri, this.onWebviewResolved.bind(this));
    const disposable = vscode.window.registerWebviewViewProvider('pbt-test-tree', provider);
    context.extension.subscriptions.push(disposable);
  }

  private onWebviewResolved(webview: vscode.Webview): void {
    this.webview = webview;

    this.context.testStore.onTestUpdate(this.sendTestUpdateToWebview.bind(this));
    
    this.webview.onDidReceiveMessage(
      (message: WebviewToExtensionMessage) => {
        switch (message.type) {
          case 'webview-ready':
            this.fetchTestSuite();
            break;
          case 'build-test-suite':
            this.buildTestSuite();
            break;
          case 'update-test-tree':
            this.updateTestTree(message.payload.testTree);
            break;
          case 'run-test':
            this.runTests(message.payload!.testIds);
            break;
        }
      },
      undefined,
      this.context.extension.subscriptions
    );
  }

  private fetchTestSuite(): void {
    const testSuite = this.context.testStore.getTestSuite();
    if (testSuite !== null) {
      this.sendTestSuiteToWebview(testSuite);
    }
  }

  private buildTestSuite(): void {
    this.context.testStore.buildTestSuite().then((testSuite: TestSuite) => {
      this.sendTestSuiteToWebview(testSuite);
    });
  }

  private sendTestSuiteToWebview(testSuite: TestSuite): void {
    if (this.webview !== null) {
      this.webview.postMessage({ type: 'test-suite', payload: testSuite } as ExtensionToWebviewMessage);
    }
  }

  private updateTestTree(testTree: TestTree): void {
    this.context.testStore.setTestTree(testTree);
  }

  private sendTestUpdateToWebview(test: Test): void {
    if (this.webview !== null) {
      this.webview.postMessage({ type: 'test-update', payload: { test } } as ExtensionToWebviewMessage);
    }
  }

  private runTests(testIds: number[]): void {
    this.context.testStore.runTest(testIds);
  }
}