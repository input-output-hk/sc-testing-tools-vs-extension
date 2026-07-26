// Test

type Test = {
  id: string;
  name: string;
  group: Array<string>;
  location: Location;
  status: TestStatus;
  source: TestDiscoverySource;
  isRunnable: boolean;
  runId?: number;
  isPlaceholder?: boolean;
  note?: string;
  time?: number;
  percentage?: number;
};

type TestDiscoverySource = "static" | "authoritative";

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
  workspacePath: string;
  packagePath: string;
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
  status: TestStatus;
  tree: TestTree;
};

// Webview message

type ExtensionToWebviewMessage =
  | { type: "test-package-list", payload: TestPackageData }
  | { type: "test-suite-update", payload: { packageName: string, suiteName: string, status: TestStatus } }
  | { type: "test-update", payload: { test: Test } }
  | { type: "execution-mode-config", payload: { executionMode: ExtensionMode } }
  | { type: "dependency-status", payload: { hasError: boolean, message: string } };

type WebviewToExtensionMessage =
  | { type: "webview-ready" }
  | { type: "run-tests", payload: { testIds: Array<string> } }
  | { type: "run-test-suite", payload: { packageName: string, suiteName: string } }
  | { type: "update-test-packages-list", payload: { packages: TestPackageList } }
  | { type: "update-execution-mode", payload: { executionMode: ExtensionMode } };

// RPC message

type ExtensionMode = "docker" | "nix";

type ListTestsParams = {
  workspacePaths: Array<string>;
}

type ListTestsResult = TestPackageData;

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
  event: import("./streaming-events").SCToolsStreamingEvent;
  error: undefined;
} | {
  rawEvent: unknown;
  error: string;
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