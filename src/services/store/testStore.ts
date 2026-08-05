import { createHash } from 'node:crypto';
import * as vscode from 'vscode';

import RpcClient from '../rpcClient';
import Database from '../database';
import { renderCoverageForEditor, clearCoverageForEditor, getFileCoverageStats } from '../../utils/coverage';
import { PbtContext } from '../../extension';

export default class TestStore {
  private context: PbtContext = {} as PbtContext;
  private database: Database;
  private rpcClient: RpcClient;

  private workspaces: Map<string, string>;
  private staticTestTree: TestTree | null = null;
  private openState: Record<string, boolean> = {};

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
        this.database.getCoverageForFile(editor.document.uri.toString()).then(statements => {
          renderCoverageForEditor(editor, statements);
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

  public async getTestTree(): Promise<TestTree> {
    if (this.staticTestTree === null) {
      this.staticTestTree = await this.rpcClient.prefetchTestTree({
        workspaces: Array.from(this.workspaces.entries()).map(([id, path]) => ({ id, path }))
      });
      for (const packageId of Object.keys(this.staticTestTree.packages)) {
        this.openState[packageId] = true;
      }
      await this.database!.handleTestTree(this.staticTestTree);
      return this.staticTestTree;
    }
    
    return await this.database!.buildTestTree(this.staticTestTree, this.openState);
  }

  public updateOpenTestTreeNode(
    isOpen: boolean,
    workspaceId: string,
    packageName: string,
    suiteName?: string,
    path?: Array<string>
  ): void {
    const id = [workspaceId, packageName];
    if (suiteName) id.push(suiteName);
    if (suiteName && path) id.push(...path);
    this.openState[id.join(':')] = isOpen;
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

  public async getTestResult(testId: TestId): Promise<TestResult> {
    return {
      test: await this.database.getTest(testId),
      rounds: await this.database.getTestRounds(testId),
    };
  }
  
  public async getCoverage(): Promise<Array<FileCoverageWithStats>> {
    const coverageItemsWithStats: Array<FileCoverageWithStats> = [];
    const coverageItems = await this.database.getCoverage();
    for (const coverageItem of coverageItems) {
      const coverageWithStats = await getFileCoverageStats(coverageItem);
      coverageItemsWithStats.push(coverageWithStats);
    }
    return coverageItemsWithStats;
  }

  public async getCoverageForTest(testId: TestId): Promise<Array<FileCoverageWithStats>> {
    const coverageItemsWithStats: Array<FileCoverageWithStats> = [];
    const coverageItems = await this.database.getCoverageForTest(testId);
    for (const coverageItem of coverageItems) {
      const coverageWithStats = await getFileCoverageStats(coverageItem);
      coverageItemsWithStats.push(coverageWithStats);
    }
    return coverageItemsWithStats;
  }

  public onTestUpdate(callback: (test: Test) => void): void {
    this.database.onTestUpdate(callback);
  }

  public onTestSuiteUpdate(callback: ({ packageId, suite }: TestSuiteUpdate) => void): void {
    this.database.onTestSuiteUpdate(this.openState, callback);
  }

  public onTestSuiteStatusUpdate(callback: ({ suiteId, status }: TestSuiteStatusUpdate) => void): void {
    this.database.onTestSuiteStatusUpdate(callback);
  }

  public onCoverageUpdate(callback: (fileCoverageWithStats: FileCoverageWithStats) => void): void {
    this.database.onCoverageUpdate(async fileCoverage => {
      callback(await getFileCoverageStats(fileCoverage));
    });
  }
}
