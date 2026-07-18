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

type TestSuiteStatus = "pending" | "building" | "failed" | "ready";

// Webview message

type ExtensionToWebviewMessage =
  | { type: "test-package-list", payload: TestPackageData }
  | { type: "test-suite-tree", payload: TestSuiteData }
  | { type: "test-suite-update", payload: { packageName: string, suiteName: string, status: TestSuiteStatus } }
  | { type: "test-update", payload: { test: Test } }
  | { type: "execution-mode-config", payload: { executionMode: ExtensionMode } }
  | { type: "dependency-status", payload: { hasError: boolean, hasDocker: boolean, hasNix: boolean, message: string } };

type WebviewToExtensionMessage =
  | { type: "webview-ready" }
  | { type: "build-test-suite-tree", payload: { packageName: string, suiteName: string } }
  | { type: "update-test-packages-list", payload: { packages: TestPackageList } }
  | { type: "run-tests", payload: { testIds: Array<string> } }
  | { type: "update-execution-mode", payload: { executionMode: ExtensionMode } };  

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

type RunTestsContext = {
  packageName: string;
  suiteName: string;
  testIds: Array<number>;
}

type TestResult = {
  id: string;
  status: TestStatus;
  time: number;
}

type ScriptExecutionErrorData = {
  kind: 'script-execution-error';
  scriptPath: string;
  params: Array<string>;
  exitCode: number | null;
  stderr: string;
  stdout: string;
  runContext?: RunTestsContext;
}

type RunTestsErrorData = ScriptExecutionErrorData & {
  runContext: RunTestsContext;
}

// Errors

type DependencyError = {
  hasError: boolean;
  message: string;
}