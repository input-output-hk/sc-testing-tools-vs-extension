import * as vscode from 'vscode';

import RpcClient, { type TestResult } from './rpcClient';
import { PbtContext } from '../extension';

export default class TestStore {
  private rpcClient: RpcClient;
  private testList: TestList | null = null;
  private testTree: TestTree | null = null;
  private testUpdateCallbacks: ((test: Test) => void)[] = [];

  constructor(context: vscode.ExtensionContext) {
    this.rpcClient = new RpcClient(context);
  }

  public async initialize(context: PbtContext): Promise<void> {
    await this.rpcClient.initialize(context);

    this.rpcClient.onTestResult((result: TestResult) => {
      if (this.testList !== null && this.testList[result.id]) {
        this.testList[result.id].status = result.status;
        this.testList[result.id].time = result.time;
        this.notifyTestUpdate(this.testList[result.id]);
      }
    });
  }

  private createTestTreeNode(test: Test): void {
    let node: TreeGroupNode | null = null;
    for (const group of test.group) {
      if (node === null) {
        node = this.getTestTreeGroupNode(this.testTree!, group);
      } else {
        node = this.getTestTreeGroupNode(node.nodes, group);
      }
    }
    node!.nodes[test.id] = { type: 'test', testId: test.id } as TreeTestNode;
  }

  private getTestTreeGroupNode(nodes: TestTree, group: string): TreeGroupNode {
    if (nodes[group] !== undefined) {
      return nodes[group] as TreeGroupNode;
    }
    const newNode = { type: 'group', isOpen: false, name: group, nodes: {} } as TreeGroupNode;
    nodes[group] = newNode;
    return newNode;
  }

  public async buildTestSuite(): Promise<TestSuite> {
    const testList = await this.rpcClient.buildTestList();
    this.testList = {};
    this.testTree = {};
    for (const test of testList) {
      this.testList[test.id] = test;
      this.createTestTreeNode(test);
    }
    return {
      testList: this.testList!,
      testTree: this.testTree!
    };
  }

  public getTestSuite(): TestSuite | null {
    if (this.testList === null || this.testTree === null) {
      return null;
    }
    return {
      testList: this.testList,
      testTree: this.testTree
    };
  };

  public setTestTree(testTree: TestTree): void {
    this.testTree = testTree;
  }

  public onTestUpdate(callback: (test: Test) => void): void {
    this.testUpdateCallbacks.push(callback);
  }

  private notifyTestUpdate(test: Test): void {
    for (const callback of this.testUpdateCallbacks) {
      callback(test);
    }
  }

  public runTest(testIds: number[]): void {
    if (this.testList === null) {
      return;
    }
    for (const testId of testIds) {
      if (this.testList[testId]) {
        this.testList[testId]!.status = 'running';
        this.testList[testId]!.time = 0;
        this.notifyTestUpdate(this.testList[testId]!);
      }
    }
    this.rpcClient.runTest(testIds);
  }
}
