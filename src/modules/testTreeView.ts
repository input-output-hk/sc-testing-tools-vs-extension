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
    this.context.store.testStore.onTestSuiteUpdate(this.sendTestSuiteUpdate.bind(this));
    this.context.store.testStore.onTestSuiteStatusUpdate(this.sendTestSuiteStatusUpdate.bind(this));

    this.webview.onDidReceiveMessage(
      (message: WebviewToExtensionMessage) => {
        switch (message.type) {
          case 'webview-ready':
            this.fetchTestTree();
            break;
            case 'run-tests':
              this.runTests(message.payload.testIds);
              break;
            case 'update-test-tree':
              this.updateTestTree(message.payload);
              break;
        }
      },
      undefined,
      this.context.extension.subscriptions
    );
  }

  private fetchTestTree(): void {
    const testTree = this.context.store.testStore.getTestTree();
    if (testTree !== null) {
      this.sendTestTreeToWebview(testTree);
    } else {
      this.context.store.testStore.prefetchTestTree().then((testTree: TestTree) => {
        this.sendTestTreeToWebview(testTree);
      });
    }
  }

  private sendTestTreeToWebview(testTree: TestTree): void {
    if (this.webview !== null) {
      this.webview.postMessage({ type: 'test-tree', payload: { testTree } } as ExtensionToWebviewMessage);
    }
  }

  private runTests(testIds: Array<RunTestId>): void {
    this.context.store.testStore.runTests(testIds);
  }

  private updateTestTree({ isOpen, workspaceId, packageName, suiteName, path }: TestTreeUpdate): void {
    this.context.store.testStore.updateOpenTestTreeNode(
      isOpen, workspaceId, packageName, suiteName, path
    );
  }

  private sendTestUpdateToWebview(test: Test): void {
    if (this.webview !== null) {
      this.webview.postMessage({ type: 'test-update', payload: { test } } as ExtensionToWebviewMessage);
    }
  }

  private sendTestSuiteUpdate({ packageId, suite }: TestSuiteUpdate): void {
    if (this.webview !== null) {
      this.webview.postMessage({ type: 'test-suite-update', payload: { packageId, suite } } as ExtensionToWebviewMessage);
    }
  }

  private sendTestSuiteStatusUpdate({ suiteId, status }: TestSuiteStatusUpdate): void {
    if (this.webview !== null) {
      this.webview.postMessage({ type: 'test-suite-status-update', payload: { suiteId, status } } as ExtensionToWebviewMessage);
    }
  }
}