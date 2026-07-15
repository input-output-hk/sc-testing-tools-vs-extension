import * as vscode from 'vscode';

import RpcClient from './rpcClient';
import { PbtContext } from '../extension';

const MOCK_COUNTEREXAMPLE_STEPS = [
  { txHash: 'd03abcb194238e97b78fde2ad23965150fdf72b156731759b60f7d493836adba', data: { datum: 'datum1', redeemer: 'redeemer1', variable1: '1111' }, discarded: false },
  { txHash: 'd03abcb194238e97b78fde2ad23965150fdf72b156731759b60f7d493836adbb', data: { datum: 'datum2', redeemer: 'redeemer2', variable1: '2222' }, discarded: false },
  { txHash: 'd03abcb194238e97b78fde2ad23965150fdf72b156731759b60f7d493836adbc', data: { datum: 'datum3', redeemer: 'redeemer3', variable1: '3333' }, discarded: false },
  { txHash: 'd03abcb194238e97b78fde2ad23965150fdf72b156731759b60f7d493836adbd', data: { datum: 'datum4', redeemer: 'redeemer4', variable1: '4444' }, discarded: false },
  { txHash: 'd03abcb194238e97b78fde2ad23965150fdf72b156731759b60f7d493836adbe', data: {}, discarded: true },
  { txHash: 'd03abcb194238e97b78fde2ad23965150fdf72b156731759b60f7d493836adbf', data: {}, discarded: true },
  { txHash: 'd03abcb194238e97b78fde2ad23965150fdf72b156731759b60f7d493836adbg', data: {}, discarded: true },
  { txHash: 'd03abcb194238e97b78fde2ad23965150fdf72b156731759b60f7d493836adbh', data: {}, discarded: true },
] as TestCounterexampleStep[];

const MOCK_GRAPH = {
  txs: [{
    hash: 'd03abcb194238e97b78fde2ad23965150fdf72b156731759b60f7d493836adbc',
    block: '2ae4a1b9031aad886938983a712c43e5ae879bc21459eb2df1e8bb665e010375',
    slot: 181077899,
    fees: 1682177,
    size: 714,
    outputAmount: [
      { unit: 'lovelace', quantity: 510442733 },
      { unit: '1d9c0b541adc300c19ddc6b9fb63c0bfe32b1508305ba65b8762dc7b5449434b45543734', quantity: 1 },
    ],
    totalOutput: 510442733,
    inputs: [
      '31596ecbdcf102c8e5c17e75c65cf9780996285879d18903f035964f3a7499a8#0',
      '26741de9ee337aa24ebeea078832a901c4deacce261e142a23186b1691513863#1',
    ],
    outputs: [
      'd03abcb194238e97b78fde2ad23965150fdf72b156731759b60f7d493836adbc#0',
      'd03abcb194238e97b78fde2ad23965150fdf72b156731759b60f7d493836adbc#1',
      'd03abcb194238e97b78fde2ad23965150fdf72b156731759b60f7d493836adbc#2',
    ],
  },{
    hash: 'd03abcb194238e97b78fde2ad23965150fdf72b156731759b60f7d493836adbd',
    block: '2ae4a1b9031aad886938983a712c43e5ae879bc21459eb2df1e8bb665e010376',
    slot: 181077900,
    fees: 1682177,
    size: 700,
    outputAmount: [{ unit: 'lovelace', quantity: 510442733 }],
    totalOutput: 510442733,
    inputs: [
      'd03abcb194238e97b78fde2ad23965150fdf72b156731759b60f7d493836adbc#0',
      'd03abcb194238e97b78fde2ad23965150fdf72b156731759b60f7d493836adbc#1',
      '31596ecbdcf102c8e5c17e75c65cf9780996285879d18903f035964f3a7499a9#3',
    ],
    outputs: [
      'd03abcb194238e97b78fde2ad23965150fdf72b156731759b60f7d493836adbd#0',
      'd03abcb194238e97b78fde2ad23965150fdf72b156731759b60f7d493836adbd#1',
    ],
  }],
  utxos: [{
    txHash: '31596ecbdcf102c8e5c17e75c65cf9780996285879d18903f035964f3a7499a8',
    outputIndex: 0,
    address: 'addr1wy8ccvgzslpjf9yhrprvmqulpmjpkpxf8c0hvtjwvw8n6pqdcrnp0',
    referenceScriptHash: '1d9c0b541adc300c19ddc6b9fb63c0bfe32b1508305ba65b8762dc7b',
    amount: [{
      unit: 'lovelace',
      quantity: 12507620,
    }],
  },{
    txHash: '26741de9ee337aa24ebeea078832a901c4deacce261e142a23186b1691513863',
    outputIndex: 1,
    address: 'addr1wywecz65rtwrqrqemhrtn7mrczl7x2c4pqc9hfjmsa3dc7cr5pvqw',
    datum: 'Test Datum',
    amount: [{
      unit: 'lovelace',
      quantity: 1124910,
    },{
      unit: 'e1ddde8138579e255482791d9fba0778cb1f5c7b435be7b3e42069de425549444c45524645535432303236',
      quantity: 1,
    }],
  },{
    txHash: 'd03abcb194238e97b78fde2ad23965150fdf72b156731759b60f7d493836adbc',
    outputIndex: 0,
    address: 'addr1qygsresrr4z5zggkwee8kz808ea3mzn7prhgfmralnqxvjvz57923as3zdhkgevjhq24qefkj074en0efej63ejhn2asau4xh2',
    amount: [{
      unit: 'lovelace',
      quantity: 12507620,
    }],
  },{
    txHash: 'd03abcb194238e97b78fde2ad23965150fdf72b156731759b60f7d493836adbc',
    outputIndex: 1,
    address: 'addr1qygsresrr4z5zggkwee8kz808ea3mzn7prhgfmralnqxvjvz57923as3zdhkgevjhq24qefkj074en0efej63ejhn2asau4xh2',
    amount: [{
      unit: 'lovelace',
      quantity: 12507620,
    }],
  },{
    txHash: 'd03abcb194238e97b78fde2ad23965150fdf72b156731759b60f7d493836adbc',
    outputIndex: 2,
    address: 'addr1qygsresrr4z5zggkwee8kz808ea3mzn7prhgfmralnqxvjvz57923as3zdhkgevjhq24qefkj074en0efej63ejhn2asau4xh2',
    amount: [{
      unit: 'lovelace',
      quantity: 12507620,
    }],
  },{
    txHash: '31596ecbdcf102c8e5c17e75c65cf9780996285879d18903f035964f3a7499a9',
    outputIndex: 3,
    address: 'addr1wy8ccvgzslpjf9yhrprvmqulpmjpkpxf8c0hvtjwvw8n6pqdcrnp0',
    amount: [{
      unit: 'lovelace',
      quantity: 12507620,
    }],
  },{
    txHash: 'd03abcb194238e97b78fde2ad23965150fdf72b156731759b60f7d493836adbd',
    outputIndex: 0,
    address: 'addr1wy8ccvgzslpjf9yhrprvmqulpmjpkpxf8c0hvtjwvw8n6pqdcrnp0',
    amount: [{
      unit: 'lovelace',
      quantity: 12507620,
    }],
  },{
    txHash: 'd03abcb194238e97b78fde2ad23965150fdf72b156731759b60f7d493836adbd',
    outputIndex: 1,
    address: 'addr1wy8ccvgzslpjf9yhrprvmqulpmjpkpxf8c0hvtjwvw8n6pqdcrnp0',
    amount: [{
      unit: 'lovelace',
      quantity: 12507620,
    }],
  }],
} as TestGraph;

export interface TestSettings {
  mode: ExtensionMode;
  rounds: number;
}

export default class TestStore {
  private rpcClient: RpcClient;
  private tests: TestList = {};
  private packages: TestPackageList | null = null;
  private testUpdateCallbacks: ((test: Test) => void)[] = [];
  
  private settings: TestSettings = {
    mode: 'docker',
    rounds: 1,
  };

  constructor(context: vscode.ExtensionContext) {
    this.rpcClient = new RpcClient(context);
  }

  public async initialize(context: PbtContext): Promise<void> {
    await this.rpcClient.initialize(context);

    this.rpcClient.onTestResult((result: TestRunResult) => {
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

  public async buildSuiteTestTree(packageName: string, suiteName: string): Promise<TestSuiteData|null> {
    const testPackage = this.packages?.[packageName];
    if (!testPackage) return null;

    const testSuite = testPackage.suites[suiteName];
    if (!testSuite) return null;

    const testList = await this.rpcClient.listTests({
      mode: this.settings.mode,
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

  public getTestResult(testId: string): TestResult | null {
    const test = this.tests[testId];
    if (!test) return null;
    return { test, counterexampleSteps: MOCK_COUNTEREXAMPLE_STEPS, graph: MOCK_GRAPH };
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

  public runTests(workspacePath: string, packageName: string, suiteName: string, testIds: Array<number>): void {
    for (const id of testIds) {
      const testId = `${packageName}:${suiteName}:${id}`;
      if (this.tests[testId]) {
        this.tests[testId]!.status = 'running';
        this.tests[testId]!.time = 0;
        this.notifyTestUpdate(this.tests[testId]!);
      }
    }
    this.rpcClient.runTests({ mode: this.settings.mode, workspacePath, packageName, suiteName, testIds });
  }

  public getSettings(): TestSettings {
    return this.settings;
  }

  public setMode(mode: ExtensionMode): void {
    this.settings.mode = mode;
  }

  public setRounds(rounds: number): void {
    this.settings.rounds = rounds;
  }
}
