import * as vscode from 'vscode';

import RpcClient from '../rpcClient';
import { PbtContext } from '../../extension';

export default class TestStore {
  private context: PbtContext | null = null;
  private rpcClient: RpcClient;
  private tests: TestList = {};
  private packages: TestPackageList | null = null;
  private testUpdateCallbacks: ((test: Test) => void)[] = [];
  private runTestsErrorCallbacks: ((error: RunTestsErrorData) => void)[] = [];

  constructor(context: vscode.ExtensionContext) {
    this.rpcClient = new RpcClient(context);
  }

  public async initialize(context: PbtContext): Promise<void> {
    this.context = context;

    await this.rpcClient.initialize(context);

    this.rpcClient.onTestResult((result: TestResult) => {
      switch (result.event.event) {
        case 'test_progress':
          if (this.tests !== null && this.tests[result.id]) {
            this.tests[result.id].percentage = result.event.percent * 100;
            this.notifyTestUpdate(this.tests[result.id]);
          }
          break;
        case 'test_done':
          if (this.tests !== null && this.tests[result.id]) {
            this.tests[result.id].status = result.event.success ? 'valid' : 'invalid';
            this.tests[result.id].time = result.event.duration * 1000;
            this.notifyTestUpdate(this.tests[result.id]);
          }
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
      workspacePath: testPackage.path,
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
}
