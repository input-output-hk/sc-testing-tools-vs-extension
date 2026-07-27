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
    this.context.store.testStore.onRunTestsError(this.handleRunTestsError.bind(this));
    
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

  // Shared guard used both on initial load and on a manual refresh (e.g. from
  // ErrorView's retry button): only attempt to fetch test packages if a workspace
  // folder is actually open.
  private checkWorkspaceAndFetchTestPackages(): void {
    if (vscode.workspace.workspaceFolders?.length) {
      this.fetchTestPackages();
    } else {
      this.noFoldersDetected();
    }
  }

  private noFoldersDetected(): void {
    this.webview?.postMessage({ type: 'no-folders-detected', payload: { noFolders: true } } as ExtensionToWebviewMessage);
  }

  // Entry point for populating the tree: called once the webview signals it's ready
  // and a workspace folder is open. Serves cached package data from the store if it's
  // already been built (e.g. webview reloaded), otherwise triggers a fresh build via
  // the RPC server and forwards the result once it resolves.
  private fetchTestPackages(): void {
    const data = this.context.store.testStore.getTestPackages();
    if (data !== null) {
      this.sendTestPackagesToWebview(data);
    } else {
      this.context.store.testStore.buildTestPackages()
        .then((data: TestPackageData) => {
          this.sendTestPackagesToWebview(data);
        })
        .catch((error: unknown) => {
          this.showError('Unable to build test tree');
          this.sendTestPackagesErrorToWebview();
        });
    }
  }

  private sendTestPackagesToWebview(data: TestPackageData | null): void {
    if (this.webview !== null) {
      this.webview.postMessage({ type: 'test-package-list', payload: data } as ExtensionToWebviewMessage);
    }
  }

  private sendTestPackagesErrorToWebview(): void {
    if (this.webview !== null) {
      this.webview.postMessage({ type: 'test-package-list-error' } as ExtensionToWebviewMessage);
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
      this.showError(message);
      return false;
    }
    return true;
  }

  private async buildTestSuiteTree(packageName: string, suiteName: string): Promise<void> {
    if (!await this.ensureDependenciesReady()) {
      this.sendTestSuiteUpdateToWebview(packageName, suiteName, 'failed');
      return;
    }

    this.clearError();
    this.sendTestSuiteUpdateToWebview(packageName, suiteName, 'building');

    this.context.store.testStore.buildSuiteTestTree(packageName, suiteName)
      .then((data: TestSuiteData | null) => {
        if (this.webview !== null && data !== null) {
          this.webview.postMessage({ type: 'test-suite-tree', payload: data } as ExtensionToWebviewMessage);
        }
      })
      .catch((error: Error) => {
        this.showError(`Test tree build failed for ${packageName}/${suiteName}`);
        this.sendTestSuiteUpdateToWebview(packageName, suiteName, 'failed');
      });
  }

  private sendTestSuiteUpdateToWebview(packageName: string, suiteName: string, status: TestSuiteStatus): void {
    if (this.webview !== null) {
      this.webview.postMessage({ type: 'test-suite-update', payload: { packageName, suiteName, status } } as ExtensionToWebviewMessage);
    }
  }

  private updateTestPackagesList(packages: TestPackageList): void {
    this.context.store.testStore.updateTestPackages(packages);
  }

  private sendTestUpdateToWebview(test: Test): void {
    if (this.webview !== null) {
      this.webview.postMessage({ type: 'test-update', payload: { test } } as ExtensionToWebviewMessage);
    }
  }

  private async runTests(testIds: string[]): Promise<void> {
    if (!await this.ensureDependenciesReady()) return;

    this.clearError();

    const groupedTests: Record<string, Array<number>> = {};
    for (const testId of testIds) {
      const [packageName, suiteName, id] = testId.split(':');
      const groupName = `${packageName}:${suiteName}`;
      if (!groupedTests[groupName]) {
        groupedTests[groupName] = [];
      }
      groupedTests[groupName].push(Number(id));
    }
    try {
      for (const groupName in groupedTests) {
        const ids = groupedTests[groupName];
        const [packageName, suiteName] = groupName.split(':');
        const workspacePath = this.context.store.testStore.getTestPackages()?.packages[packageName]?.path;
        if (workspacePath !== undefined) {
          this.context.store.testStore.runTests(workspacePath, packageName, suiteName, ids);
        }
      }
    } catch (error) {
      this.showError(`Test execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private handleRunTestsError(error: RunTestsErrorData): void {
    const { packageName, suiteName } = error.runContext;
    this.showError(`Test execution failed for ${packageName}/${suiteName}`);
  }

  private showError(message: string): void {
    this.context.statusBarItem.text = `$(error) ${message}`;
    this.context.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
    this.context.statusBarItem.show();
    this.context.outputChannel.show(true);
  }

  private clearError(): void {
    this.context.statusBarItem.hide();
  }
}