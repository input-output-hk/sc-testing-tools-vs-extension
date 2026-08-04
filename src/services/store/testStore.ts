import { createHash } from 'node:crypto';
import * as vscode from 'vscode';

import RpcClient from '../rpcClient';
import Database from '../database';
import { renderCoverageForEditor, clearCoverageForEditor } from '../../utils/coverage';
import { PbtContext } from '../../extension';

export default class TestStore {
  private context: PbtContext = {} as PbtContext;
  private database: Database;
  private rpcClient: RpcClient;

  private workspaces: Map<string, string>;
  private testTree: TestTree | null = null;

  constructor(context: vscode.ExtensionContext) {
    this.rpcClient = new RpcClient(context);
    this.database = new Database();

    this.workspaces = new Map(
      vscode.workspace.workspaceFolders?.map(folder => [
        this.getWorkspaceId(folder.uri.fsPath),
        folder.uri.fsPath
      ]) || []
    );
  }

  private getWorkspaceId(workspacePath: string): string {
    return createHash('sha256').update(workspacePath).digest('hex').slice(0, 8);
  }

  public async initialize(context: PbtContext): Promise<void> {
    this.context = context;

    await this.database.initialize();
    await this.rpcClient.initialize(context);

    this.setupRpcListeners();
    this.setupCoverageListener();
  }
  
  private setupRpcListeners(): void {
    this.rpcClient.onTestEvent((event: TestEvent) => {
      switch (event.eventType) {
        case 'test-suite-update':
          this.database.handleTestSuiteUpdateEvent(event as TestSuiteUpdateEvent);
          break;
        case 'test-update':
          this.database.handleTestUpdateEvent(event as TestUpdateEvent);
          break;
        case 'test-context':
          this.database.handleTestContextEvent(event as TestContextEvent);
          break;
      }
    });

    this.rpcClient.onBuildTestTreeError((error: BuildTestTreeErrorData) => {
      //
    });

    this.rpcClient.onRunTestsError((error: RunTestsErrorData) => {
      this.database.handleTestRunFailed(error.runParams.testRun);
    });
  }

  private setupCoverageListener(): void {
    // Render coverage for active document
    vscode.window.onDidChangeActiveTextEditor(editor => {
      if (editor !== undefined) {
        this.database.getCoverageForFile(editor.document.uri.toString()).then(coverage => {
          if (coverage !== null) {
            renderCoverageForEditor(editor, coverage);
          }
        });
      }
    }, null, this.context.extension.subscriptions);

    // Remove coverage when user edits document
    vscode.workspace.onDidChangeTextDocument(event => {
      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor && event.document === activeEditor.document) {
        clearCoverageForEditor(activeEditor);
      }
    }, null, this.context.extension.subscriptions);
  }

  public async prefetchTestTree(): Promise<TestTree> {
    this.testTree = await this.rpcClient.prefetchTestTree({
      workspaces: Array.from(this.workspaces.entries()).map(([id, path]) => ({ id, path }))
    });
    await this.database!.handleTestTree(this.testTree);
    return this.testTree;
  }

  public getTestTree(): TestTree | null {
    return this.testTree;
  }

  public updateOpenTestTreeNode(
    isOpen: boolean,
    workspaceId: string,
    packageName: string,
    suiteName?: string,
    path?: Array<string>
  ): void {
    if (!this.testTree) return;

    const packageId = `${workspaceId}:${packageName}`;
    const testPackage = this.testTree.packages[packageId];
    if (!testPackage) return;

    if (!suiteName) {
      testPackage.isOpen = isOpen;
      return;
    }

    const suite = testPackage.suites[suiteName];
    if (!suite) return;

    if (!path) {
      suite.isOpen = isOpen;
      return;
    }

    let currentNode: TestTreeNode | null = null;
    for (const nodeName of path) {
      if (currentNode === null) {
        currentNode = suite.tests[nodeName] || null;
      } else if (currentNode.type === 'group') {
        currentNode = (currentNode as TestTreeGroupNode).nodes[nodeName] || null;
      }

      if (currentNode === null) return;
    }

    if (currentNode!.type === 'group') {
      (currentNode as TestTreeGroupNode).isOpen = isOpen;
    }
  }

  public buildTestTree(suiteId: TestSuiteId): void {
    const [workspaceId, packageName, suiteName] = suiteId;
    this.rpcClient.buildTestTree({
      mode: this.context!.store.settingStore.getSettings().mode,
      workspace: {
        path: this.workspaces.get(workspaceId)!,
        id: workspaceId
      },
      packageName,
      suiteName
    });
  }

  public async runTests(testIds: Array<RunTestId>): Promise<void> {
    const testRuns: Map<string, Array<RunTestId>> = new Map();
    for (const [workspaceId, packageName, suiteName, testId] of testIds) {
      if (!testRuns.has(workspaceId)) testRuns.set(workspaceId, []);
      const testRunId: RunTestId = [workspaceId, packageName, suiteName];
      if (testId) testRunId.push(testId);
      testRuns.get(workspaceId)!.push(testRunId);
    }

    for (const [workspaceId, testIds] of testRuns.entries()) {
      this.rpcClient.runTests({
        mode: this.context!.store.settingStore.getSettings().mode,
        workspace: {
          id: workspaceId,
          path: this.workspaces.get(workspaceId)!
        },
        testIds
      });
    }

    await this.database!.handleRunTests(testIds);
  }

  public onTestUpdate(callback: (test: Test) => void): void {
    this.database.onTestUpdate(callback);
  }

  public onTestSuiteUpdate(callback: ({ packageId, suite }: TestSuiteUpdate) => void): void {
    this.database.onTestSuiteUpdate(callback);
  }

  public onTestSuiteStatusUpdate(callback: ({ suiteId, status }: TestSuiteStatusUpdate) => void): void {
    this.database.onTestSuiteStatusUpdate(callback);
  }
}
