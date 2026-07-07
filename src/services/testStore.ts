import * as vscode from 'vscode';

import RpcClient from './rpcClient';
import { PbtContext } from '../extension';

export default class TestStore {
  private rpcClient: RpcClient;
  private tests: TestList = {};
  private packages: TestPackageList | null = null;
  private testUpdateCallbacks: ((test: Test) => void)[] = [];

  constructor(context: vscode.ExtensionContext) {
    this.rpcClient = new RpcClient(context);
  }

  public async initialize(context: PbtContext): Promise<void> {
    await this.rpcClient.initialize(context);

    this.rpcClient.onTestResult((result: TestResult) => {
      if (this.tests !== null && this.tests[result.id]) {
        this.tests[result.id].status = result.status;
        this.tests[result.id].time = result.time;
        this.notifyTestUpdate(this.tests[result.id]);
      }
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

  public async buildSuiteTestTree(mode: ExtensionMode, packageName: string, suiteName: string): Promise<TestSuiteData|null> {
    const testPackage = this.packages?.[packageName];
    if (!testPackage) return null;

    const testSuite = testPackage.suites[suiteName];
    if (!testSuite) return null;

    const testList = await this.rpcClient.listTests({
      mode,
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

  private notifyTestUpdate(test: Test): void {
    for (const callback of this.testUpdateCallbacks) {
      callback(test);
    }
  }

  public runTests(mode: ExtensionMode, workspacePath: string, testIds: Array<string>): void {
    for (const testId of testIds) {
      if (this.tests[testId]) {
        this.tests[testId]!.status = 'running';
        this.tests[testId]!.time = 0;
        this.notifyTestUpdate(this.tests[testId]!);
      }
    }
    this.rpcClient.runTests({ mode, workspacePath, testIds });
  }
}
