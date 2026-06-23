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

    this.context.testStore.onTestUpdate((test: Test) => {
      if (this.webview !== null) {
        this.webview.postMessage({ type: 'test-result', payload: { test } });
      }
    });
    
    this.webview.onDidReceiveMessage(
      (message: WebviewToExtensionMessage) => {
        switch (message.type) {
          case 'webview-ready':
            this.fetchTestList();
            break;
          case 'build-test-list':
              this.buildTestList();
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

  private fetchTestList(): void {
    const testList = this.context.testStore.getTestList();
    if (testList !== null) {
      this.sendTestListToWebview(testList);
    }
  }

  private buildTestList(): void {
    this.context.testStore.buildTestList().then((testList: Array<Test>) => {
      this.sendTestListToWebview(testList);
    });
  }

  private sendTestListToWebview(testList: Array<Test>): void {
    if (this.webview !== null) {
      this.webview.postMessage({ type: 'test-list', payload: { testList } } as ExtensionToWebviewMessage);
    }
  }

  private runTests(testIds: number[]): void {
    this.context.testStore.runTest(testIds);
  }
}