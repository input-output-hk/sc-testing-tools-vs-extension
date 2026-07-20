import * as vscode from 'vscode';

import RpcClient from '../rpcClient';
import { PbtContext } from '../../extension';
import { SrcLocRanges } from '../../../shared/streaming-events';

const GLOBAL_KEY = "#all_tests#";
export type StatementCoverage = {
  executed: number;
  range: vscode.Range;
}
type FileCoverage = {[key: string]: StatementCoverage};

export default class TestStore {
  private context: PbtContext | null = null;
  private rpcClient: RpcClient;
  private tests: TestList = {};
  private packages: TestPackageList | null = null;
  private testUpdateCallbacks: ((test: Test) => void)[] = [];
  private runTestsErrorCallbacks: ((error: RunTestsErrorData) => void)[] = [];
  private baseCoverageIndex: {[uri: string]: FileCoverage} = {};
  private coverageRanges: {[uri: string]: {[testId : string]: FileCoverage}} = {};
  private compareCovagerageTo: {[testId: string]: string} = {};

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
          this.context?.outputChannel.appendLine(`${suiteName} started.`);
          this.baseCoverageIndex = Object.fromEntries(evt.coverageIndex.map(f =>
            [ vscode.Uri.file(packagePath + '/' + f.file).toString()
            , toFileCoverage(f, 0)
            ]));
          break;
        case 'test_started':
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
          this.context?.outputChannel.appendLine(`Finished ${suiteName} in ${evt.duration.toFixed(1)}s, ${evt.passed}/${evt.passed+evt.failed} tests passed.`);
          break;
      }
    });

    this.rpcClient.onRunTestsError((error: RunTestsErrorData) => {
      const { packageName, suiteName, testIds } = error.runContext;
      for (const id of testIds) {
        const testId = `${packageName}:${suiteName}:${id}`;
        if (this.tests[testId]) {
          this.tests[testId]!.status = 'invalid';
          this.notifyTestUpdate(this.tests[testId]!);
        }
      }

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
    this.packages = await this.rpcClient.listSuites();
    return {
      packages: this.packages,
      tests: this.tests,
    };
  }

  public async buildSuiteTestTree(packageName: string, suiteName: string): Promise<TestSuiteData|null> {
    const testPackage = this.packages?.[packageName];
    if (!testPackage) return null;

    const testSuite = testPackage.suites[suiteName];
    if (!testSuite) return null;

    const testList = await this.rpcClient.listTests({
      mode: this.validateExecutionMode(),
      workspacePath: testPackage.workspacePath,
      packageName,
      suiteName,
    });

    for (const test of testList) {
      this.tests[test.id] = test;
      this.createTestTreeNode(test);
    }

    return {
      packageName,
      suiteName,
      tree: testSuite.tree,
      tests: testList,
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

  private notifyRunTestsError(error: RunTestsErrorData): void {
    for (const callback of this.runTestsErrorCallbacks) {
      callback(error);
    }
  }

  public runTests(workspacePath: string, packageName: string, suiteName: string, testIds: Array<number>): void {
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