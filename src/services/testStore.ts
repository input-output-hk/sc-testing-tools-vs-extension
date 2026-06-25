import * as vscode from 'vscode';

import RpcClient, { type TestResult } from './rpcClient';
import { PbtContext } from '../extension';

export default class TestStore {
  private rpcClient: RpcClient;
  private testList: Record<number, Test> | null = null;
  private testUpdateCallbacks: ((test: Test) => void)[] = [];

  constructor(context: vscode.ExtensionContext) {
    this.rpcClient = new RpcClient(context);
  }

  public async initialize(context: PbtContext): Promise<void> {
    await this.rpcClient.initialize();

    this.rpcClient.onTestResult((result: TestResult) => {
      if (this.testList !== null && this.testList[result.id]) {
        this.testList[result.id].status = result.status;
        this.testList[result.id].time = result.time;
        this.notifyTestUpdate(this.testList[result.id]);
      }
    });
  }

  public async buildTestList(): Promise<Array<Test>> {
    const testList = await this.rpcClient.buildTestList();
    this.testList = {};
    for (const test of testList) {
      this.testList[test.id] = test;
    }
    return testList;
  }

  public getTestList(): Array<Test> | null {
    return this.testList ? Object.values(this.testList) : null;
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
