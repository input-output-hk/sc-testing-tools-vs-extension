import * as vscode from 'vscode';
import { PbtContext } from '../extension';
import { GenericWebviewViewProvider } from '../utils/webview';

export default class TestCoverageView {
  private context: PbtContext;
  private webview: vscode.Webview | null = null;
  private scope: CoverageScope = { type: 'all' };

  constructor() {
    this.context = {} as PbtContext;
  }

  public activate(context: PbtContext) {
    this.context = context;

    const TestCoverageProvider = new GenericWebviewViewProvider(context.extension.extensionUri, 'testCoverage', this.onWebviewResolved.bind(this));
    const TestCoveragePanel = vscode.window.registerWebviewViewProvider('pbt-test-coverage', TestCoverageProvider);
    context.extension.subscriptions.push(TestCoveragePanel);
    
    const closeCommand = vscode.commands.registerCommand('pbt-extension.closeTestCoverage', () => this.close());
    context.extension.subscriptions.push(closeCommand);
    
    const collapseAllCommand = vscode.commands.registerCommand('pbt-extension.collapseAllTestCoverage', () => this.collapseAll());
    context.extension.subscriptions.push(collapseAllCommand);
  }

  public showAllCoverage(): void {
    this.scope = { type: 'all' };
    this.fetchCoverage();
  }

  public showTestCoverage(testId: TestId, testName: string): void {
    this.scope = { type: 'test', testId, testName };
    this.fetchCoverage();
    vscode.commands.executeCommand('pbt-test-coverage.focus');
  }

  private close(): void {
    this.scope = { type: 'all' };
    vscode.commands.executeCommand('pbt-test-coverage.removeView');
  }
  
  private collapseAll(): void {
    this.context.store.testStore.collapseCoverage();
    this.fetchCoverage();
  }

  private onWebviewResolved(webview: vscode.Webview): void {
    this.webview = webview;

    this.context.store.testStore.onCoverageUpdate(this.sendCoverageUpdate.bind(this));

    this.webview.onDidReceiveMessage(
      (message: WebviewToExtensionMessage) => {
        switch (message.type) {
          case 'webview-ready':
            this.fetchCoverage();
            break;
          case 'coverage-show-all':
            this.showAllCoverage();
            break;
          case 'coverage-open-file':
            this.openFile(message.payload.filePath);
            break;
          case 'coverage-tree-update':
            this.context.store.testStore.updateOpenCoverage(
              message.payload.isOpen, message.payload.path
            );
            break;
        }
      },
      undefined,
      this.context.extension.subscriptions
    );
  }

  private async fetchCoverage(): Promise<void> {
    const coverageTree = this.scope.type === 'test'
      ? await this.context.store.testStore.getCoverageForTest(this.scope.testId)
      : await this.context.store.testStore.getCoverage();
    this.webview?.postMessage({ type: 'coverage-tree', payload: { coverageTree, scope: this.scope } } as ExtensionToWebviewMessage);
  }

  private sendCoverageUpdate(coverageTree: CoverageTree): void {
    if (this.scope.type === 'all') {
      this.webview?.postMessage({ type: 'coverage-tree', payload: { coverageTree, scope: this.scope } } as ExtensionToWebviewMessage);
    }
  }
  
  private async openFile(filePath: string): Promise<void> {
    const document = await vscode.workspace.openTextDocument(filePath);
    await vscode.window.showTextDocument(document);
  }
}
