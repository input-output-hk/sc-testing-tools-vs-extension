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
    const testTreeWebviewView = vscode.window.registerWebviewViewProvider('pbt-test-tree', provider);
    context.extension.subscriptions.push(testTreeWebviewView);
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
          case 'fetch-test-tree':
            this.checkWorkspaceAndFetchTestTree();
            break;
          case 'open-folder':
            this.openFolder();
            break;
          case 'run-tests':
            this.runTests(message.payload.testIds);
            break;
          case 'open-test-results':
            this.openTestResults(message.payload.testId);
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
  private checkWorkspaceAndFetchTestTree(): void {
    if (vscode.workspace.workspaceFolders?.length) {
      this.fetchTestTree();
    } else {
      this.noFoldersDetected();
    }
  }

  private fetchTestTree(): void {
    this.context.store.testStore.getTestTree().then((testTree: TestTree) => {
      this.sendTestTreeToWebview(testTree);
    }).catch((error: unknown) => {
      this.showError('Test discovery failed', error instanceof Error ? error.message : String(error));
      this.sendTestTreeErrorToWebview();
    });
  }

  private sendTestTreeToWebview(testTree: TestTree): void {
    if (this.webview !== null) {
      this.webview.postMessage({ type: 'test-tree', payload: { testTree } } as ExtensionToWebviewMessage);
    }
  }

  private sendTestTreeErrorToWebview(): void {
    if (this.webview !== null) {
      this.webview.postMessage({ type: 'test-tree-error' } as ExtensionToWebviewMessage);
    }
  }

  private noFoldersDetected(): void {
    if (this.webview !== null) {
      this.webview.postMessage({ type: 'empty-workspaces' } as ExtensionToWebviewMessage);
    }
  }

  private openFolder(): void {
    vscode.commands.executeCommand('vscode.openFolder');
  }

  // Pre-flight check run right before a docker-mode action hits the RPC server: Docker
  // can stop running any time after the extension's initial checks, so re-verify it's
  // still reachable now rather than letting the RPC call fail.
  private async ensureDependenciesReady(): Promise<boolean> {
    if (this.context.store.settingStore.getSettings().mode === 'docker') {
      await this.context.store.dependencyStore.checkDockerRunning();
    }

    const { hasError } = this.context.store.dependencyStore.getDependencyError();
    if (hasError) {
      return false;
    }

    return true;
  }

  private async runTests(testIds: Array<RunTestId>): Promise<void> {
    if (!await this.ensureDependenciesReady()) return;
    this.clearError();
    this.context.store.testStore.runTests(testIds);
  }

  private openTestResults(testId: TestId): void {
    this.context.testResultView.open(testId);
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

  private showError(title: string, message: string): void {
    this.context.outputChannel.appendLine(`> ERROR: ${title}`);
    this.context.outputChannel.appendLine(message);
    this.context.outputChannel.show(true);

    this.context.statusBarItem.text = `$(error) ${title}`;
    this.context.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
    this.context.statusBarItem.show();
    vscode.window.showErrorMessage(`${title}: ${message}`);
  }

  private clearError(): void {
    this.context.statusBarItem.hide();
  }
}