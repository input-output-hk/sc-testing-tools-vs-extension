import * as vscode from 'vscode';

import RpcClient from '../rpcClient';
import { PbtContext } from '../../extension';
import { TestInfo } from '../../../shared/streaming-events';
import TestState from './testStore/testState';
import TestStoreNotifier from './testStore/notifier';
import CoverageStore, { type StatementCoverage } from './testStore/coverageStore';
import SuiteRunIntentStore, { SuiteRunIntent } from './testStore/runIntentStore';
import SuiteStateStore from './testStore/suiteState';
import RunCoordinator from './testStore/runCoordinator';
import RunExecutor from './testStore/runExecutor';
import { hydrateSuiteTestsFromRun, type SuiteHydrationContext } from './testStore/suiteHydration';
import { handleRunTestsError, handleTestResult, type RunLifecycleContext } from './testStore/runLifecycle';
import { renderCoverageForEditor } from '../../utils/coverage';

export type { StatementCoverage } from './testStore/coverageStore';

export default class TestStore {
  private context: PbtContext | null = null;
  private rpcClient: RpcClient;
  private testState = new TestState();
  private notifier = new TestStoreNotifier();
  private coverageStore = new CoverageStore();
  private runIntentStore = new SuiteRunIntentStore();
  private suiteState: SuiteStateStore;
  private runCoordinator: RunCoordinator;
  private runExecutor: RunExecutor;

  constructor(context: vscode.ExtensionContext) {
    this.rpcClient = new RpcClient(context);

    this.suiteState = new SuiteStateStore({
      getPackages: this.testState.getPackages.bind(this.testState),
      getTests: this.testState.getTests.bind(this.testState),
      notifyTestPackagesUpdate: this.notifyTestPackagesUpdate.bind(this),
      notifyTestUpdate: this.notifyTestUpdate.bind(this),
    });

    this.runCoordinator = new RunCoordinator({
      getPackages: this.testState.getPackages.bind(this.testState),
      getTests: this.testState.getTests.bind(this.testState),
      setSuiteRunIntent: this.setSuiteRunIntent.bind(this),
      notifyTestUpdate: this.notifyTestUpdate.bind(this),
      suiteState: this.suiteState,
    });

    this.runExecutor = new RunExecutor({
      getExecutionMode: () => this.context?.store.settingStore.getSettings().mode,
      logError: (message: string) => this.context?.outputChannel.append(`> ERROR\n${message}`),
      runTests: (runRequest, mode) => {
        this.rpcClient.runTests({
          mode,
          workspacePath: runRequest.workspacePath,
          packageName: runRequest.packageName,
          suiteName: runRequest.suiteName,
          testIds: runRequest.testIds,
        });
      },
    });
  }

  public async initialize(context: PbtContext): Promise<void> {
    this.context = context;

    await this.rpcClient.initialize(context);

    const runLifecycleContext = this.createRunLifecycleContext();

    this.rpcClient.onTestResult((result: TestResult) => {
      handleTestResult(result, runLifecycleContext);
    });

    this.rpcClient.onRunTestsError((error: RunTestsErrorData) => {
      handleRunTestsError(error, runLifecycleContext);
    });

    // Render coverage for active document
    vscode.window.onDidChangeActiveTextEditor(editor => {
      if (editor) {
        renderCoverageForEditor(editor, this.getCoverage(editor.document.uri))
      }
    }, null, context.extension.subscriptions);

    // Remove coverage when user edits document
    vscode.workspace.onDidChangeTextDocument(event => {
      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor && event.document === activeEditor.document) {
        renderCoverageForEditor(activeEditor, []);
      }
    }, null, context.extension.subscriptions);
  }

  private createRunLifecycleContext(): RunLifecycleContext {
    return {
      getTests: this.testState.getTests.bind(this.testState),
      getPackagePath: this.testState.getPackagePath.bind(this.testState),
      getSuiteRunIntent: this.getSuiteRunIntent.bind(this),
      hydrateSuiteTestsFromRun: this.hydrateSuiteTestsFromRun.bind(this),
      suiteState: this.suiteState,
      clearSuiteRunIntent: this.clearSuiteRunIntent.bind(this),
      notifyTestUpdate: this.notifyTestUpdate.bind(this),
      notifyRunTestsError: this.notifyRunTestsError.bind(this),
      coverageStore: this.coverageStore,
      logLine: (message: string) => this.context?.outputChannel.appendLine(message),
    };
  }

  public async buildTestPackages(): Promise<TestPackageData> {
    const packageData = await this.rpcClient.listTests();
    return this.testState.replaceAll(packageData);
  }

  public getTestPackages(): TestPackageData | null {
    return this.testState.getTestPackages();
  };

  public updateTestPackages(packages: TestPackageList): void {
    this.testState.updatePackages(packages);
  }

  public onTestPackagesUpdate(callback: (data: TestPackageData) => void): void {
    this.notifier.onTestPackagesUpdate(callback);
  }

  public onTestUpdate(callback: (test: Test) => void): void {
    this.notifier.onTestUpdate(callback);
  }

  public onRunTestsError(callback: (error: RunTestsErrorData) => void): void {
    this.notifier.onRunTestsError(callback);
  }

  private notifyTestUpdate(test: Test): void {
    this.notifier.notifyTestUpdate(test);
  }

  private notifyTestPackagesUpdate(): void {
    this.notifier.notifyTestPackagesUpdate(this.testState.getTestPackages());
  }

  private notifyRunTestsError(error: RunTestsErrorData): void {
    this.notifier.notifyRunTestsError(error);
  }

  public runTests(
    workspacePath: string,
    packageName: string,
    suiteName: string,
    testIds: Array<number>,
    runIntent: SuiteRunIntent = 'partial'
  ): void {
    const runRequest = this.runCoordinator.prepareRunTests(
      workspacePath,
      packageName,
      suiteName,
      testIds,
      runIntent,
    );

    this.runExecutor.dispatch(runRequest);
  }

  public runSuiteTests(packageName: string, suiteName: string): void {
    const runRequest = this.runCoordinator.prepareSuiteRun(packageName, suiteName);
    this.runExecutor.dispatch(runRequest);
  }

  private getSuiteRunIntent(packageName: string, suiteName: string): SuiteRunIntent {
    return this.runIntentStore.getIntent(packageName, suiteName);
  }

  private setSuiteRunIntent(packageName: string, suiteName: string, runIntent: SuiteRunIntent): void {
    this.runIntentStore.setIntent(packageName, suiteName, runIntent);
  }

  private clearSuiteRunIntent(packageName: string, suiteName: string): void {
    this.runIntentStore.clearIntent(packageName, suiteName);
  }

  private hydrateSuiteTestsFromRun(packageName: string, suiteName: string, testInfos: Array<TestInfo>): void {
    const context: SuiteHydrationContext = {
      tests: this.testState.getTests(),
      packages: this.testState.getPackages(),
      notifyTestPackagesUpdate: this.notifyTestPackagesUpdate.bind(this),
      logLine: (message: string) => this.context?.outputChannel.appendLine(message),
    };

    hydrateSuiteTestsFromRun(packageName, suiteName, testInfos, context);
  }

  // Get the coverage for a specific file and test item. If no test item is provided, return the global coverage for all tests.
  public getCoverage(fileUri: vscode.Uri, testItemId?: string): StatementCoverage[] {
    return this.coverageStore.getCoverage(fileUri, testItemId, this.context?.outputChannel);
  }
}