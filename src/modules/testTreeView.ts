import * as vscode from 'vscode';
import { GenericWebviewViewProvider } from '../utils/webview';

import type { PbtContext } from '../extension';

export default class TestTreeView {
  private context: PbtContext;
  private webview: vscode.Webview | null = null;

  constructor() {
    this.context = {} as PbtContext;
  }

  public activate(context: PbtContext) {
    this.context = context;
    const provider = new GenericWebviewViewProvider(context.extension.extensionUri, 'testTree', this.onWebviewResolved.bind(this));
    const disposable = vscode.window.registerWebviewViewProvider('pbt-test-tree', provider);
    context.extension.subscriptions.push(disposable);
  }

  private onWebviewResolved(webview: vscode.Webview): void {
    this.webview = webview;

    this.context.store.testStore.onTestUpdate(this.sendTestUpdateToWebview.bind(this));
    
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
    const data = this.context.store.testStore.getTestPackages();
    if (data !== null) {
      this.sendTestPackagesToWebview(data);
    } else {
      this.context.store.testStore.buildTestPackages().then((data: TestPackageData) => {
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
    this.context.store.testStore.buildSuiteTestTree(packageName, suiteName).then((data: TestSuiteData | null) => {
      if (this.webview !== null && data !== null) {
        this.webview.postMessage({ type: 'test-suite-tree', payload: data } as ExtensionToWebviewMessage);
      }
    });
  }

  private updateTestPackagesList(packages: TestPackageList): void {
    this.context.store.testStore.updateTestPackages(packages);
  }

  private sendTestUpdateToWebview(test: Test): void {
    if (this.webview !== null) {
      this.webview.postMessage({ type: 'test-update', payload: { test } } as ExtensionToWebviewMessage);
    }
  }

  private runTests(testIds: string[]): void {
    const groupedTests: Record<string, Array<number>> = {};
    for (const testId of testIds) {
      const [packageName, suiteName, id] = testId.split(':');
      const groupName = `${packageName}:${suiteName}`;
      if (!groupedTests[groupName]) {
        groupedTests[groupName] = [];
      }
      groupedTests[groupName].push(Number(id));
    }
    for (const groupName in groupedTests) {
      const ids = groupedTests[groupName];
      const [packageName, suiteName] = groupName.split(':');
      const workspacePath = this.context.store.testStore.getTestPackages()?.packages[packageName]?.path;
      if (workspacePath !== undefined) {
        this.context.store.testStore.runTests(workspacePath, packageName, suiteName, ids);
      }
    }
  }
}