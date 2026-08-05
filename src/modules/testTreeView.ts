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
            this.checkWorkspaceAndFetchTestPackages();
            break;
          case 'open-folder':
            vscode.commands.executeCommand('vscode.openFolder');
            break;
          case 'refresh-test-packages':
            this.checkWorkspaceAndFetchTestPackages();
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

  // Shared guard used both on initial load and on a manual refresh (e.g. from
  // ErrorView's retry button): only attempt to fetch test packages if a workspace
  // folder is actually open.
  private checkWorkspaceAndFetchTestPackages(): void {
    if (vscode.workspace.workspaceFolders?.length) {
      this.fetchTestTree();
    } else {
      this.noFoldersDetected();
    }
  }

  private noFoldersDetected(): void {
    this.webview?.postMessage({ type: 'no-folders-detected', payload: { noFolders: true } } as ExtensionToWebviewMessage);
  }

  private fetchTestTree(): void {
    this.context.store.testStore.getTestTree().then((testTree: TestTree) => {
      this.sendTestTreeToWebview(testTree);
    });
  }

  private sendTestTreeToWebview(testTree: TestTree): void {
    if (this.webview !== null) {
      this.webview.postMessage({ type: 'test-tree', payload: { testTree } } as ExtensionToWebviewMessage);
    }
  }

  private async runTests(testIds: Array<RunTestId>): Promise<void> {
    const ready = await this.ensureDependenciesReady();
    if (!ready) return;

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

  // Pre-flight check run right before a docker-mode action hits the RPC server: Docker
  // can stop running any time after the extension's initial checks, so re-verify it's
  // still reachable now rather than letting the RPC call fail.
  private async ensureDependenciesReady(): Promise<boolean> {
    if (this.context.store.settingStore.getSettings().mode === 'docker') {
      await this.context.store.dependencyStore.checkDockerRunning();
    }

    const { hasError, message } = this.context.store.dependencyStore.getDependencyError();
    if (hasError) {
      return false;
    }
    return true;
  }
}