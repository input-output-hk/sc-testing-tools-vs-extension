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
  | { type: "test-update", payload: { test: Test } };

type WebviewToExtensionMessage =
  | { type: "webview-ready" }
  | { type: "build-test-suite-tree", payload: { packageName: string, suiteName: string } }
  | { type: "update-test-packages-list", payload: { packages: TestPackageList } }
  | { type: "run-tests", payload: { testIds: Array<string> } };

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
	testIds: Array<string>;
}

type TestResult = {
  id: string;
  status: TestStatus;
  time: number;
}
