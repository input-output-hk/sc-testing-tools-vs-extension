import * as vscode from 'vscode';
import { GenericWebviewViewProvider } from '../utils/webview';
import { createTestTree } from '../utils/testTree';

import type { PbtContext } from '../extension';

export default class TestSummaryView {
  private context: PbtContext;
  private webview: vscode.Webview | null = null;
  private testId: TestId | null = null;
  private runId: string | null = null;

  constructor() {
    this.context = {} as PbtContext;
  }

  public activate(context: PbtContext) {
    this.context = context;
    const provider = new GenericWebviewViewProvider(context.extension.extensionUri, 'testSummary', this.onWebviewResolved.bind(this));
    const testSummaryWebviewView = vscode.window.registerWebviewViewProvider('pbt-test-summary', provider);
    context.extension.subscriptions.push(testSummaryWebviewView);

    const clearHistoryCommand = vscode.commands.registerCommand('pbt-extension.clearTestRunsHistory', this.clearTestRunsHistory.bind(this));
    context.extension.subscriptions.push(clearHistoryCommand);

    const collapseCommand = vscode.commands.registerCommand('pbt-extension.collapseTestSummary', this.collapseTestSummary.bind(this));
    context.extension.subscriptions.push(collapseCommand);

    this.context.store.testStore.onTestTreeUpdate(this.onTestTreeUpdate.bind(this));
    this.context.store.testStore.onTestJobUpdate(this.onTestJobUpdate.bind(this));
  }

  public showTestSummary(testId: TestId): void {
    this.testId = testId;
    this.runId = null;
    this.sendTestSummary();
    vscode.commands.executeCommand('pbt-test-summary.focus');
  }

  private async clearTestRunsHistory(): Promise<void> {
    await vscode.commands.executeCommand('pbt-extension.clearAllTestsResults');
    this.testId = null;
    this.runId = null;
    this.webview?.postMessage({ type: 'test-summary-clear' } as ExtensionToWebviewMessage);
    this.sendTestSummaryHistory();
  }

  private collapseTestSummary(): void {
    this.webview?.postMessage({ type: 'test-summary-collapse' } as ExtensionToWebviewMessage);
  }

  private onWebviewResolved(webview: vscode.Webview): void {
    this.webview = webview;

    this.webview.onDidReceiveMessage(
      (message: WebviewToExtensionMessage) => {
        switch (message.type) {
          case 'webview-ready':
            this.setSortBy(this.context.testTreeView.getSortBy());
            this.sendTestSummary();
            this.sendTestSummaryHistory();
            break;
          case 'test-summary-open-round':
            this.context.testResultView.openRun(message.payload.testId, message.payload.runId, message.payload.roundId);
            break;
          case 'test-summary-open-test':
            this.openTest(message.payload.testId, message.payload.runId);
            break;
          case 'test-summary-open-results':
            this.openTestResults(message.payload.testId, message.payload.runId);
            break;
        }
      },
      undefined,
      this.context.extension.subscriptions
    );
  }

  public setSortBy(sortBy: SortBy): void {
    this.webview?.postMessage({ type: 'test-summary-set-sort', payload: { sortBy } } as ExtensionToWebviewMessage);
  }

  private openTest(testId: TestId, runId: string): void {
    this.testId = testId;
    this.runId = runId;
    this.sendTestSummary();
  }

  private openTestResults(testId: TestId, runId: string): void {
    this.context.testResultView.openRun(testId, runId, null);
  }

  private onTestTreeUpdate(payload: TestTreeUpdate): void {
    if (payload.type !== 'test') return;
    this.sendTestSummaryHistory();
    if (
      this.testId !== null &&
      payload.test.id.join(':') === this.testId.join(':') &&
      (this.runId === null || this.runId === payload.test.lastRunId)
    ) {
      this.sendTestSummary();
    }
  }

  private onTestJobUpdate(job: TestJob | null): void {
    this.sendTestSummaryHistory();
    if (job !== null && job.type === 'run' && (job.status === 'success' || job.status === 'failed')) {
      vscode.commands.executeCommand('pbt-test-summary.focus');
    }
  }

  private async sendTestSummaryHistory(): Promise<void> {
    if (this.webview === null) return;

    const testStore = this.context.store.testStore;
    const history = await testStore.getTestRunsHistory();
    const activeRunId = testStore.getActiveHistoryRunId();
    const liveTests: GenericMap<Test> = {};
    const livePackages: GenericMap<TestPackage> = {};
    this.collectLiveTests(await testStore.getTestTree(), liveTests, livePackages);

    const runs: Array<TestRunTree> = [];
    for (const run of history) {
      runs.push({
        runId: run.runId,
        status: run.status,
        startedOn: run.startedOn,
        finishedOn: run.finishedOn,
        testTree: this.buildRunTestTree(run, liveTests, livePackages, run.runId === activeRunId),
      });
    }
    this.webview?.postMessage({ type: 'test-summary-history', payload: { runs, activeRunId } } as ExtensionToWebviewMessage);
  }

  private collectLiveTests(testTree: TestTree, liveTests: GenericMap<Test>, livePackages: GenericMap<TestPackage>): void {
    for (const [packageKey, testPackage] of Object.entries(testTree.packages)) {
      livePackages[packageKey] = testPackage;
      for (const suite of Object.values(testPackage.suites)) {
        this.collectNodeTests(suite.tests, liveTests);
      }
    }
  }

  private collectNodeTests(nodes: TestTreeNodeMap, liveTests: GenericMap<Test>): void {
    for (const node of Object.values(nodes)) {
      if (node.type === 'group') {
        this.collectNodeTests((node as TestTreeGroupNode).nodes, liveTests);
      } else {
        const test = (node as TestTreeTestNode).test;
        liveTests[test.id.join(':')] = test;
      }
    }
  }

  private buildRunTestTree(run: TestRunHistory, liveTests: GenericMap<Test>, livePackages: GenericMap<TestPackage>, isActive: boolean): TestTree {
    const suiteTests: GenericMap<Array<Test>> = {};
    for (const row of [...run.tests].sort(this.compareRowsBySuite)) {
      const live = liveTests[row.id.join(':')];
      const suiteKey = [row.id[0], row.id[1], row.id[2]].join(':');
      suiteTests[suiteKey] ??= [];
      suiteTests[suiteKey].push({
        id: row.id,
        name: live?.name ?? row.id[3],
        group: row.group,
        status: row.status,
        type: row.type,
        time: row.time,
        isStatic: live?.isStatic ?? false,
        hasCoverage: false,
        isWaiting: isActive && (live?.isWaiting ?? false),
        isBuilding: isActive && (live?.isBuilding ?? false),
        isRunning: isActive && (live?.isRunning ?? false),
      });
    }

    const testTree: TestTree = { packages: {} };
    for (const tests of Object.values(suiteTests)) {
      const [workspaceId, packageName, suiteName] = tests[0].id;
      const packageId: TestPackageId = [workspaceId, packageName];
      const packageKey = packageId.join(':');
      const livePackage = livePackages[packageKey];
      testTree.packages[packageKey] ??= {
        id: packageId,
        name: packageName,
        packagePath: livePackage?.packagePath ?? '',
        workspace: livePackage?.workspace ?? { id: workspaceId, path: '' },
        suites: {},
        isOpen: false,
      };
      const suiteId: TestSuiteId = [workspaceId, packageName, suiteName];
      testTree.packages[packageKey].suites[suiteName] = {
        id: suiteId,
        name: suiteName,
        status: 'undetermined',
        isWaiting: false,
        isBuilding: false,
        isRunning: false,
        isStatic: false,
        isOpen: false,
        tests: createTestTree(suiteId, {}, tests),
      };
    }
    return testTree;
  }

  private compareRowsBySuite(a: TestResultHistory, b: TestResultHistory): number {
    return a.id[1].localeCompare(b.id[1]) || a.id[2].localeCompare(b.id[2]);
  }

  private async sendTestSummary(): Promise<void> {
    if (this.webview === null || this.testId === null) return;

    const runId = this.runId;
    const testResult = runId === null
      ? await this.context.store.testStore.getTestResult(this.testId)
      : await this.context.testResultView.getTestRunResult(this.testId, runId);
    if (testResult.test.status === 'undetermined') return;
    const previousRunStartedOn = await this.context.testResultView.getPreviousRunStartedOn(runId);
    this.webview?.postMessage({ type: 'test-summary-details', payload: { testResult, runId, previousRunStartedOn } } as ExtensionToWebviewMessage);
  }
}
