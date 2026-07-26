import * as vscode from 'vscode';
import * as path from 'path';

import RpcClient from '../rpcClient';
import { PbtContext } from '../../extension';
import { SrcLocRanges, TestInfo } from '../../../shared/streaming-events';

const GLOBAL_KEY = "#all_tests#";
export type StatementCoverage = {
  executed: number;
  range: vscode.Range;
}
type FileCoverage = {[key: string]: StatementCoverage};
type SuiteRunIntent = 'full-suite' | 'partial';

export default class TestStore {
  private context: PbtContext | null = null;
  private rpcClient: RpcClient;
  private tests: TestList = {};
  private packages: TestPackageList | null = null;
  private testPackagesUpdateCallbacks: ((data: TestPackageData) => void)[] = [];
  private testUpdateCallbacks: ((test: Test) => void)[] = [];
  private runTestsErrorCallbacks: ((error: RunTestsErrorData) => void)[] = [];
  private baseCoverageIndex: {[uri: string]: FileCoverage} = {};
  private coverageRanges: {[uri: string]: {[testId : string]: FileCoverage}} = {};
  private compareCovagerageTo: {[testId: string]: string} = {};
  private suiteRunIntents: Record<string, SuiteRunIntent> = {};

  constructor(context: vscode.ExtensionContext) {
    this.rpcClient = new RpcClient(context);
  }

  public async initialize(context: PbtContext): Promise<void> {
    this.context = context;

    await this.rpcClient.initialize(context);

    this.rpcClient.onTestResult((result: TestResult) => {
      if (result.error !== undefined) {
        this.context?.outputChannel.appendLine(`ERROR: ${result.error}\n${JSON.stringify(result.rawEvent)}`);
        return;
      }
      const [packageName, suiteName] = result.id.split(':');
      const packagePath = this.getPackagePath(packageName);
      let evt = result.event;
      switch (evt.event) {
        case 'suite_started':
          {
            const runIntent = this.getSuiteRunIntent(packageName, suiteName);
            this.context?.outputChannel.appendLine(`${suiteName} started (${runIntent}).`);
            if (runIntent === 'full-suite') {
              this.hydrateSuiteTestsFromRun(packageName, suiteName, evt.tests);
            } else {
              this.context?.outputChannel.appendLine(`Skipping suite tree hydration for partial run ${packageName}/${suiteName}.`);
            }
          }
          this.baseCoverageIndex = Object.fromEntries(evt.coverageIndex.map(f =>
            [ vscode.Uri.file(packagePath + '/' + f.file).toString()
            , toFileCoverage(f, 0)
            ]));
          break;
        case 'test_started':
          if (!this.tests[result.id]) break;
          this.tests[result.id].status = 'running';
          this.tests[result.id].time = 0;
          this.tests[result.id].percentage = 0;
          this.notifyTestUpdate(this.tests[result.id]);
          break;
        case 'test_trace':
          this.addCovered(packagePath, evt.covered, result.id);
          evt.trace.threatModels.map(tm => {
            let tmId = `${packageName}:${suiteName}:${tm.testId}`;
            this.compareCovagerageTo[tmId] = result.id;
            this.addCovered(packagePath, tm.covered, tmId);
          });
          break;
        case 'test_progress':
          if (!this.tests[result.id]) break;
          this.tests[result.id].percentage = evt.percent * 100;
          this.notifyTestUpdate(this.tests[result.id]);
          break;
        case 'test_done':
          if (!this.tests[result.id]) break;
          if (!evt.success) {
            this.context?.outputChannel.appendLine(`${this.tests[result.id].name}: FAILED`);
            this.context?.outputChannel.appendLine('  ' + evt.description.replace(/\n/g, '\n  '));
          }
          this.tests[result.id].status = evt.success ? 'valid' : 'invalid';
          this.tests[result.id].time = evt.duration * 1000;
          this.notifyTestUpdate(this.tests[result.id]);
          break;
        case 'suite_done':
          this.updateSuiteStatus(packageName, suiteName, evt.failed === 0 ? 'valid' : 'invalid');
          this.clearSuiteRunIntent(packageName, suiteName);
          this.context?.outputChannel.appendLine(`Finished ${suiteName} in ${evt.duration.toFixed(1)}s, ${evt.passed}/${evt.passed+evt.failed} tests passed.`);
          break;
      }
    });

    this.rpcClient.onRunTestsError((error: RunTestsErrorData) => {
      const { packageName, suiteName, testIds } = error.runContext;
      if (testIds.length > 0) {
        for (const id of testIds) {
          const testId = `${packageName}:${suiteName}:${id}`;
          if (this.tests[testId]) {
            this.tests[testId]!.status = 'invalid';
            this.notifyTestUpdate(this.tests[testId]!);
          }
        }
      } else {
        this.markSuiteRunningTestsAsFailed(packageName, suiteName);
      }

      this.updateSuiteStatus(packageName, suiteName, 'invalid');
      this.clearSuiteRunIntent(packageName, suiteName);

      this.notifyRunTestsError(error);
    });
  }

  private getPackagePath(packageName: string): string {
    return this.packages?.[packageName]?.packagePath || "";
  }

  private getTestTree(test: Test): TestTree | null {
    const [packageName, suiteName] = test.id.split(':');
    if (!this.packages || !this.packages[packageName]) return null;
    const suite = this.packages[packageName].suites[suiteName];
    if (!suite) return null;
    return suite.tree;
  }

  private createTestTreeNode(test: Test): void {
    if (test.group.length === 0) {
      const tree = this.getTestTree(test);
      if (!tree) return;
      tree[test.id] = { type: 'test', testId: test.id } as TestTreeTestNode;
      return;
    }

    let node: TestTreeGroupNode | null = null;
    for (const group of test.group) {
      if (node === null) {
        const tree = this.getTestTree(test);
        if (!tree) return;
        node = this.getTestTreeGroupNode(tree, group);
      } else {
        node = this.getTestTreeGroupNode(node.nodes, group);
      }
    }
    node!.nodes[test.id] = { type: 'test', testId: test.id } as TestTreeTestNode;
  }

  private getTestTreeGroupNode(nodes: TestTree, group: string): TestTreeGroupNode {
    if (nodes[group] !== undefined) {
      return nodes[group] as TestTreeGroupNode;
    }
    const newNode = { type: 'group', isOpen: false, name: group, nodes: {} } as TestTreeGroupNode;
    nodes[group] = newNode;
    return newNode;
  }

  public async buildTestPackages(): Promise<TestPackageData> {
    const packageData = await this.rpcClient.listTests();
    this.packages = packageData.packages;
    this.tests = packageData.tests;
    return packageData;
  }

  private removeSuiteTests(tree: TestTree): void {
    for (const [key, node] of Object.entries(tree)) {
      if (node.type === 'test') {
        const testId = (node as TestTreeTestNode).testId;
        delete this.tests[testId];
        continue;
      }

      if (node.type === 'group') {
        this.removeSuiteTests((node as TestTreeGroupNode).nodes);
      }
    }
  }

  public getTestPackages(): TestPackageData | null {
    if (this.packages === null) {
      return null;
    }
    return {
      packages: this.packages,
      tests: this.tests
    };
  };

  public updateTestPackages(packages: TestPackageList): void {
    this.packages = packages;
  }

  public onTestPackagesUpdate(callback: (data: TestPackageData) => void): void {
    this.testPackagesUpdateCallbacks.push(callback);
  }

  public onTestUpdate(callback: (test: Test) => void): void {
    this.testUpdateCallbacks.push(callback);
  }

  public onRunTestsError(callback: (error: RunTestsErrorData) => void): void {
    this.runTestsErrorCallbacks.push(callback);
  }

  private notifyTestUpdate(test: Test): void {
    for (const callback of this.testUpdateCallbacks) {
      callback(test);
    }
  }

  private notifyTestPackagesUpdate(): void {
    const packageData = this.getTestPackages();
    if (packageData === null) {
      return;
    }

    for (const callback of this.testPackagesUpdateCallbacks) {
      callback(packageData);
    }
  }

  private notifyRunTestsError(error: RunTestsErrorData): void {
    for (const callback of this.runTestsErrorCallbacks) {
      callback(error);
    }
  }

  public runTests(
    workspacePath: string,
    packageName: string,
    suiteName: string,
    testIds: Array<number>,
    runIntent: SuiteRunIntent = 'partial'
  ): void {
    this.setSuiteRunIntent(packageName, suiteName, runIntent);
    this.updateSuiteStatus(packageName, suiteName, 'running');

    for (const id of testIds) {
      const testId = `${packageName}:${suiteName}:${id}`;
      if (this.tests[testId]) {
        this.tests[testId]!.status = 'running';
        this.tests[testId]!.time = 0;
        this.notifyTestUpdate(this.tests[testId]!);
      }
    }
    this.rpcClient.runTests({
      mode: this.validateExecutionMode(),
      workspacePath, packageName, suiteName, testIds
    });
  }

  public runSuiteTests(packageName: string, suiteName: string): void {
    const testPackage = this.packages?.[packageName];
    if (!testPackage) {
      throw new Error(`Unknown package: ${packageName}`);
    }

    const testSuite = testPackage.suites[suiteName];
    if (!testSuite) {
      throw new Error(`Unknown suite: ${packageName}/${suiteName}`);
    }

    const testIds = this.getSuiteRunIds(testSuite.tree)
      .map((testId) => this.tests[testId]?.runId)
      .filter((id): id is number => Number.isInteger(id));

    this.runTests(testPackage.workspacePath, packageName, suiteName, testIds, 'full-suite');
  }

  private getSuiteKey(packageName: string, suiteName: string): string {
    return `${packageName}:${suiteName}`;
  }

  private getSuiteRunIntent(packageName: string, suiteName: string): SuiteRunIntent {
    const suiteKey = this.getSuiteKey(packageName, suiteName);
    return this.suiteRunIntents[suiteKey] ?? 'partial';
  }

  private setSuiteRunIntent(packageName: string, suiteName: string, runIntent: SuiteRunIntent): void {
    const suiteKey = this.getSuiteKey(packageName, suiteName);
    this.suiteRunIntents[suiteKey] = runIntent;
  }

  private clearSuiteRunIntent(packageName: string, suiteName: string): void {
    const suiteKey = this.getSuiteKey(packageName, suiteName);
    delete this.suiteRunIntents[suiteKey];
  }

  private getSuiteRunIds(tree: TestTree): Array<string> {
    const ids: Array<string> = [];
    for (const node of Object.values(tree)) {
      if (node.type === 'test') {
        ids.push((node as TestTreeTestNode).testId);
      } else if (node.type === 'group') {
        ids.push(...this.getSuiteRunIds((node as TestTreeGroupNode).nodes));
      }
    }
    return ids;
  }

  private getSuiteTestsByRunId(tree: TestTree): Map<number, Test> {
    const previousByRunId = new Map<number, Test>();
    for (const testId of this.getSuiteRunIds(tree)) {
      const test = this.tests[testId];
      if (!test || !Number.isInteger(test.runId)) {
        continue;
      }
      previousByRunId.set(test.runId as number, test);
    }
    return previousByRunId;
  }

  private collectGroupOpenState(
    tree: TestTree,
    parentPath: Array<string> = [],
    state: Record<string, boolean> = {}
  ): Record<string, boolean> {
    for (const node of Object.values(tree)) {
      if (node.type !== 'group') {
        continue;
      }

      const groupNode = node as TestTreeGroupNode;
      const groupPath = [...parentPath, groupNode.name];
      const pathKey = this.getGroupPathKey(groupPath);

      state[pathKey] = state[pathKey] || groupNode.isOpen;
      this.collectGroupOpenState(groupNode.nodes, groupPath, state);
    }

    return state;
  }

  private restoreGroupOpenState(
    tree: TestTree,
    state: Record<string, boolean>,
    parentPath: Array<string> = []
  ): void {
    for (const node of Object.values(tree)) {
      if (node.type !== 'group') {
        continue;
      }

      const groupNode = node as TestTreeGroupNode;
      const groupPath = [...parentPath, groupNode.name];
      const pathKey = this.getGroupPathKey(groupPath);

      if (state[pathKey] !== undefined) {
        groupNode.isOpen = state[pathKey];
      }

      this.restoreGroupOpenState(groupNode.nodes, state, groupPath);
    }
  }

  private getGroupPathKey(path: Array<string>): string {
    return JSON.stringify(path);
  }

  private hydrateSuiteTestsFromRun(packageName: string, suiteName: string, testInfos: Array<TestInfo>): void {
    const testPackage = this.packages?.[packageName];
    const testSuite = testPackage?.suites[suiteName];
    if (!testPackage || !testSuite) {
      return;
    }

    const previousGroupOpenState = this.collectGroupOpenState(testSuite.tree);
    const previousTestsByRunId = this.getSuiteTestsByRunId(testSuite.tree);

    if (testInfos.length === 0) {
      this.context?.outputChannel.appendLine(
        `No tests reported in suite_started for ${packageName}/${suiteName}; keeping current tree state.`
      );
      testSuite.status = 'running';
      this.notifyTestPackagesUpdate();
      return;
    }

    this.removeSuiteTests(testSuite.tree);
    testSuite.tree = {};

    for (const testInfo of testInfos) {
      const authoritativeTest = this.buildAuthoritativeTestFromInfo(
        testPackage.packagePath,
        packageName,
        suiteName,
        testInfo,
        previousTestsByRunId.get(testInfo.id)
      );
      this.tests[authoritativeTest.id] = authoritativeTest;
      this.createTestTreeNode(authoritativeTest);
    }

    this.restoreGroupOpenState(testSuite.tree, previousGroupOpenState);

    testSuite.status = 'running';
    this.notifyTestPackagesUpdate();
  }

  private buildAuthoritativeTestFromInfo(
    packagePath: string,
    packageName: string,
    suiteName: string,
    testInfo: TestInfo,
    previousTest?: Test
  ): Test {
    const testId = `${packageName}:${suiteName}:${testInfo.id}`;
    const sourceLocation = testInfo.srcLoc;
    const location: Location = {
      uri: sourceLocation?.file ? path.join(packagePath, sourceLocation.file) : '',
      startLine: sourceLocation?.startLine ?? 1,
      startCharacter: sourceLocation?.startCol ?? 1,
      endLine: sourceLocation?.endLine ?? (sourceLocation?.startLine ?? 1),
      endCharacter: sourceLocation?.endCol ?? (sourceLocation?.startCol ?? 1),
    };

    return {
      id: testId,
      name: testInfo.name,
      group: testInfo.path,
      location,
      status: previousTest?.status === 'running' ? 'running' : 'undetermined',
      source: 'authoritative',
      isRunnable: true,
      runId: testInfo.id,
      isPlaceholder: false,
      time: previousTest?.status === 'running' ? 0 : undefined,
      percentage: previousTest?.status === 'running' ? 0 : undefined,
    };
  }

  private updateSuiteStatus(packageName: string, suiteName: string, status: TestStatus): void {
    const testSuite = this.packages?.[packageName]?.suites[suiteName];
    if (!testSuite) {
      return;
    }

    testSuite.status = status;
    this.notifyTestPackagesUpdate();
  }

  private markSuiteRunningTestsAsFailed(packageName: string, suiteName: string): void {
    const suiteTree = this.packages?.[packageName]?.suites[suiteName]?.tree;
    if (!suiteTree) {
      return;
    }

    for (const testId of this.getSuiteRunIds(suiteTree)) {
      const test = this.tests[testId];
      if (!test || test.status !== 'running') {
        continue;
      }

      test.status = 'invalid';
      this.notifyTestUpdate(test);
    }
  }

  private validateExecutionMode(): ExtensionMode {
    const mode = this.context?.store.settingStore.getSettings().mode;
    if (!mode) {
      const errorMessage = 'Execution mode is not set';
      this.context?.outputChannel.append(`> ERROR\n${errorMessage}`);
      throw new Error(errorMessage);
    }
    return mode;
  }

  // Get the coverage for a specific file and test item. If no test item is provided, return the global coverage for all tests.
  public getCoverage(fileUri: vscode.Uri, testItemId?: string): StatementCoverage[] {
    let testKey = testItemId || GLOBAL_KEY;
    let allDetails = this.coverageRanges[fileUri.toString()];
    if (!allDetails) {
      this.context?.outputChannel.appendLine(`No coverage found for ${fileUri}, only for ${Object.keys(this.coverageRanges)}`);
      return [];
    }
    let details = allDetails[testKey];
    if (!details) {
      this.context?.outputChannel.appendLine(`No coverage found for ${testItemId}, only for ${Object.keys(allDetails)}`);
      return [];
    }
    if (this.compareCovagerageTo[testKey]) {
      let compare = allDetails[this.compareCovagerageTo[testKey]];
      let result = [];
      for (let key in details)
        if (!compare[key]) result.push(details[key]);
      for (let key in compare) {
        if (!details[key]) {
          result.push({ executed: 0, range: compare[key].range});
        }
      }
      return result;
    } else {
      let base = this.baseCoverageIndex[fileUri.toString()];
      if (!base) {
        this.context?.outputChannel.appendLine(`No coverage index found for ${fileUri}, only for ${Object.keys(this.baseCoverageIndex)}`);
        return [];
      }
      return Object.values(Object.assign({}, base, details));
    }
  }

  private addCovered(packagePath: string, covered: SrcLocRanges[], testItemId: string) {
    for (const cov of covered) {
      let covData = toFileCoverage(cov, 1);
      let uri = vscode.Uri.file(packagePath + '/' + cov.file).toString();
      this.coverageRanges[uri] ||= {};
      this.coverageRanges[uri][GLOBAL_KEY] ||= {};
      this.coverageRanges[uri][testItemId] ||= {};
      for (let key in covData) {
        let cov = covData[key];
        if (!this.coverageRanges[uri][GLOBAL_KEY][key]?.executed)
          this.coverageRanges[uri][GLOBAL_KEY][key] = cov;
        else
          this.coverageRanges[uri][GLOBAL_KEY][key].executed++;

        if (!this.coverageRanges[uri][testItemId][key]?.executed)
          this.coverageRanges[uri][testItemId][key] = cov;
        else
          this.coverageRanges[uri][testItemId][key].executed++;
      }
    }
  }
}

// Convert SrcLocRanges to a FileCoverage object, which maps each statement range to its execution count and range.
function toFileCoverage(covData: SrcLocRanges, executed: number): FileCoverage {
  return Object.fromEntries(covData.startLines.map((startLine, i) => {
    let startCol = covData.startCols[i];
    let endLine = covData.endLines[i];
    let endCol = covData.endCols[i];
    let range = new vscode.Range(
      new vscode.Position(startLine - 1, startCol - 1),
      new vscode.Position(endLine - 1, endCol - 1)
    );
    return [`${startLine},${startCol}-${endLine},${endCol}`, {executed, range}];
  }));
}