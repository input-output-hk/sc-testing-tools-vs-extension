// Test

type Test = {
  id: string;
  name: string;
  group: Array<string>;
  location: Location;
  status: TestStatus;
  time?: number;
};

type TestStatus = "undetermined" | "running" | "valid" | "invalid";

type Location = {
  uri: string;
  startLine: number;
  startCharacter: number;
  endLine: number;
  endCharacter: number;
}

type TestList = Record<string, Test>;

// Test Tree

type TestTree = Record<string, TestTreeNode>;

type TestTreeNode = {
  type: "group" | "test";
};

type TestTreeGroupNode = TestTreeNode & {
  type: "group";
  name: string;
  isOpen: boolean;
  nodes: TestTree;
};

type TestTreeTestNode = TestTreeNode & {
  type: "test";
  testId: string;
};

// Test Suite

type TestPackageList = Record<string, TestPackage>;

type TestSuiteList = Record<string, TestSuite>;

type TestPackage = {
  name: string;
  path: string;
  isOpen: boolean;
  suites: TestSuiteList;
};

type TestPackageData = {
  packages: TestPackageList;
  tests: TestList;
}

type TestSuite = {
  name: string;
  isOpen: boolean;
  status: TestSuiteStatus;
  tree: TestTree;
};

type TestSuiteData = {
  packageName: string;
  suiteName: string;
  tree: TestTree;
  tests: Array<Test>;
}

type TestSuiteStatus = "pending" | "building" | "ready";

// Webview message

type ExtensionToWebviewMessage =
  | { type: "test-package-list", payload: TestPackageData }
  | { type: "test-suite-tree", payload: TestSuiteData }
  | { type: "test-update", payload: { test: Test } }
  | { type: "test-result", payload: { result: TestResult | null, tests: TestList } };

type WebviewToExtensionMessage =
  | { type: "webview-ready" }
  | { type: "build-test-suite-tree", payload: { packageName: string, suiteName: string } }
  | { type: "update-test-packages-list", payload: { packages: TestPackageList } }
  | { type: "run-tests", payload: { testIds: Array<string> } }
  | { type: "open-test-result", payload: { testId: string } };

// RPC message

type ExtensionMode = "docker" | "nix";

type ListSuitesParams = {
  workspacePaths: Array<string>;
}

type ListTestsParams = {
  mode: ExtensionMode;
  workspacePath: string;
  packageName: string;
  suiteName: string;
}

type RunTestsParams = {
  mode: ExtensionMode;
  workspacePath: string;
	packageName: string;
  suiteName: string;
  testIds: Array<number>;
}

type TestRunResult = {
  id: string;
  status: TestStatus;
  time: number;
}

// Test Result panel

type TestResult = {
  test: Test;
  counterexampleSteps?: TestCounterexampleStep[];
  graph?: TestGraph;
};

type TestCounterexampleStep = {
  txHash: string;
  data: Record<string, string>;
  discarded: boolean;
};

type TestGraph = {
  txs: {
    hash: string;
    block: string;
    slot: number;
    fees: number;
    size: number;
    outputAmount: {
      unit: string;
      quantity: number;
    }[];
    totalOutput: number;
    inputs: string[];
    outputs: string[];
  }[];
  utxos: {
    txHash: string;
    outputIndex: number;
    address: string;
    datum?: string;
    referenceScriptHash?: string;
    amount: {
      unit: string;
      quantity: number;
    }[];
  }[];
};
