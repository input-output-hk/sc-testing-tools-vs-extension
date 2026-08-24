import { createHash } from 'node:crypto';
import * as vscode from 'vscode';

import RpcClient from '../rpcClient';
import Database from '../database';
import {
  renderCoverageForEditor,
  clearCoverageForEditor,
  buildCoverageTree,
  updateCoverageTree
} from '../../utils/coverage';
import { PbtContext } from '../../extension';

export default class TestStore {
  private context: PbtContext = {} as PbtContext;
  private database: Database;
  private rpcClient: RpcClient;

  private workspaces: Map<string, string>;
  private staticTestTree: TestTree | null = null;
  private coverageTree: CoverageTree | null = null;
  private testOpenState: Record<string, boolean> = {};
  private coverageOpenState: Record<string, boolean> = {};

  constructor(context: vscode.ExtensionContext) {
    this.rpcClient = new RpcClient(context);
    this.database = new Database();

    this.workspaces = new Map(
      vscode.workspace.workspaceFolders?.map(folder => [
        this.makeWorkspaceId(folder.uri.fsPath),
        folder.uri.fsPath
      ]) || []
    );
  }

  private makeWorkspaceId(workspacePath: string): string {
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
      const testSuiteId: TestSuiteId = [error.runParams.workspace.id, error.runParams.packageName, error.runParams.suiteName];
      this.database.handleBuildTestTreeFailed(testSuiteId, this.staticTestTree);
    });

    this.rpcClient.onRunTestsError((error: RunTestsErrorData) => {
      this.database.handleTestRunFailed(error.runParams.testRun, this.staticTestTree);
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
        this.testOpenState[packageId] = true;
      }
      await this.database!.handleTestTree(this.staticTestTree);
      return this.staticTestTree;
    }
    
    return await this.database!.buildTestTree(this.staticTestTree, this.testOpenState);
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
    this.testOpenState[id.join(':')] = isOpen;
  }

  public updateOpenCoverage(
    isOpen: boolean,
    path: Array<string>
  ): void {
    this.coverageOpenState[path.join(':')] = isOpen;
  }

  public collapseCoverage(): void {
    for (const key of Object.keys(this.coverageOpenState)) {
      this.coverageOpenState[key] = false;
    }
  }

  public async buildTestTree(suiteId: TestSuiteId): Promise<void> {
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

    await this.database!.handleBuildTestSuite(suiteId);
  }

  public async buildAllTestSuites(): Promise<void> {
    const suiteIds = await this.database!.getAllTestSuitesIds();
    for (const suiteId of suiteIds) {
      await this.buildTestTree(suiteId);
    }
  }

  public async runAllTests(): Promise<void> {
    const suiteIds = await this.database!.getAllTestSuitesIds();
    await this.runTests(suiteIds);
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

  public async getTestResultWithGroupTests(testId: TestId): Promise<TestResultWithGroupTests> {
    const test = await this.database.getTest(testId);
    return {
      test,
      rounds: await this.database.getTestRounds(testId),
      groupTests: await this.database.getTestsByGroup(testId, test.group),
    };
  }

  public async getTestRounds(testId: TestId): Promise<Array<TestRound>> {
    return await this.database.getTestRounds(testId);
  }

  public async getTestsByGroup(testId: TestId, group: Array<string>): Promise<Array<Test>> {
    return await this.database.getTestsByGroup(testId, group);
  }
  
  public async getCoverage(): Promise<CoverageTree> {
    const files = await this.database.getCoverage();
    this.coverageTree = buildCoverageTree(files, this.coverageOpenState);
    return this.coverageTree;
  }

  public async getCoverageForTest(testId: TestId): Promise<CoverageTree> {
    const files = await this.database.getCoverageForTest(testId);
    return buildCoverageTree(files, this.coverageOpenState);
  }

  public onTestUpdate(callback: (test: Test) => void): void {
    this.database.onTestUpdate(callback);
  }

  public onTestSuiteUpdate(callback: ({ packageId, suite }: TestSuiteUpdate) => void): void {
    this.database.onTestSuiteUpdate(this.testOpenState, callback);
  }

  public onTestSuiteStatusUpdate(callback: ({ suiteId, status }: TestSuiteStatusUpdate) => void): void {
    this.database.onTestSuiteStatusUpdate(callback);
  }

  public onCoverageUpdate(callback: (coverageTree: CoverageTree) => void): void {
    this.database.onCoverageUpdate(async file => {
      if (this.coverageTree === null) {
        this.coverageTree = await this.getCoverage();
      } else {
        updateCoverageTree(this.coverageTree, file, this.coverageOpenState);
      }
      callback(this.coverageTree);
    });
  }
}
