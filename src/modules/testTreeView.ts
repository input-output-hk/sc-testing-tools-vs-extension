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
            this.fetchTestPackages();
            break;
          case 'build-test-suite-tree':
            this.buildTestSuiteTree(message.payload.packageName, message.payload.suiteName);
            break;
          case 'update-test-packages-list':
            this.updateTestPackagesList(message.payload.packages);
            break;
          case 'run-tests':
            this.runTests(message.payload.testIds);
            break;
        }
      },
      undefined,
      this.context.extension.subscriptions
    );
  }

  private fetchTestPackages(): void {
    const data = this.context.testStore.getTestPackages();
    if (data !== null) {
      this.sendTestPackagesToWebview(data);
    } else {
      this.context.testStore.buildTestPackages().then((data: TestPackageData) => {
        this.sendTestPackagesToWebview(data);
      });
    }
  }

  private sendTestPackagesToWebview(data: TestPackageData | null): void {
    if (this.webview !== null) {
      this.webview.postMessage({ type: 'test-package-list', payload: data } as ExtensionToWebviewMessage);
    }
  }

  private buildTestSuiteTree(packageName: string, suiteName: string): void {
    this.context.testStore.buildSuiteTestTree('docker', packageName, suiteName).then((data: TestSuiteData | null) => {
      if (this.webview !== null && data !== null) {
        this.webview.postMessage({ type: 'test-suite-tree', payload: data } as ExtensionToWebviewMessage);
      }
    });
  }

  private updateTestPackagesList(packages: TestPackageList): void {
    this.context.testStore.updateTestPackages(packages);
  }

  private sendTestUpdateToWebview(test: Test): void {
    if (this.webview !== null) {
      this.webview.postMessage({ type: 'test-update', payload: { test } } as ExtensionToWebviewMessage);
    }
  }

  private runTests(testIds: string[]): void {
    const groupedTests: Record<string, string[]> = {};
    for (const testId of testIds) {
      const [packageName] = testId.split(':');
      if (!groupedTests[packageName]) {
        groupedTests[packageName] = [];
      }
      groupedTests[packageName].push(testId);
    }
    for (const packageName in groupedTests) {
      const ids = groupedTests[packageName];
      const workspacePath = this.context.testStore.getTestPackages()?.packages[packageName]?.path;
      if (workspacePath !== undefined) {
        this.context.testStore.runTests('docker', workspacePath, ids);
      }
    }
  }
}