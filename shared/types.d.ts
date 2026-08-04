// Test

type RunStatus = "undetermined" | "waiting" | "running" | "valid" | "invalid";

type TestPackageId = [
  workspaceId: string,
  packageName: string
];

type TestSuiteId = [
  workspaceId: string,
  packageName: string,
  suiteName: string
];

type TestId = [
  workspaceId: string,
  packageName: string,
  suiteName: string,
  testId: string
];

type RunTestId = TestSuiteId | TestId;

type Test = {
  id: TestId;
  name: string;
  group: Array<string>;
  status: RunStatus;
  location?: TestLocation;
  time?: number;
  percentage?: number;
};

type TestRangePosition = {
  line: number;
  character: number;
};

type TestRange = {
  start: TestRangePosition;
  end: TestRangePosition;
};

type TestLocation = {
  uri: string;
  range: TestRange;
};

type TestRun = {
  workspaceId: string;
  packageName: string;
  suiteName: string;
  testIds?: Array<string>;
};

type Workspace = {
  id: string;
  path: string;
};

// Test Tree

type TestTree = {
  packages: TestPackageMap;
};

type TestPackageMap = Record<string, TestPackage>;

type TestPackage = {
  name: string;
  packagePath: string;
  workspace: Workspace;
  suites: TestSuiteMap;
  isOpen: boolean;
};

type TestSuiteMap = Record<string, TestSuite>;

type TestSuite = {
  name: string;
  status: RunStatus;
  tests: TestTreeNodeMap;
  isOpen: boolean;
};

type TestTreeNode = {
  type: "group" | "test";
};

type TestTreeNodeMap = Record<string, TestTreeNode>;

type TestTreeGroupNode = TestTreeNode & {
  type: "group";
  name: string;
  nodes: TestTreeNodeMap;
  isOpen: boolean;
};

type TestTreeTestNode = TestTreeNode & {
  type: "test";
  test: Test;
};

// Coverage

type FileCoverageMap = Record<string, FileCoverage>;

type FileCoverage = {
  fileUri: string;
  statements: Record<string, Array<TestId>>;
};

// Webview message

// Coverage

type CoverageTestSummary = {
  testId: string;
  name: string;
  percentage: number;
};

type CoverageFileSummary = {
  uri: string;
  percentage: number;
  tests: Array<CoverageTestSummary>;
};

type TestSuiteUpdate = {
  packageId: TestPackageId;
  suite: TestSuite;
};

type TestSuiteStatusUpdate = {
  suiteId: TestSuiteId;
  status: RunStatus;
};

type TestTreeUpdate = {
  isOpen: boolean;
  workspaceId: string;
  packageName: string;
  suiteName?: string;
  path?: Array<string>;
};

type ExtensionToWebviewMessage =
  | { type: "test-tree", payload: { testTree: TestTree } }
  | { type: "test-update", payload: { test: Test } }
  | { type: "test-suite-update", payload: TestSuiteUpdate }
  | { type: "test-suite-status-update", payload: TestSuiteStatusUpdate }
  | { type: "execution-mode-config", payload: { executionMode: ExtensionMode } }
  | { type: "dependency-status", payload: { hasError: boolean, message: string } }
  | { type: "coverage-summary", payload: { files: Array<CoverageFileSummary> } }
  | { type: "coverage-update", payload: { file: CoverageFileSummary } };

type WebviewToExtensionMessage =
  | { type: "webview-ready" }
  | { type: "run-tests", payload: { testIds: Array<RunTestId> } }
  | { type: "update-test-tree", payload: TestTreeUpdate }
  | { type: "update-execution-mode", payload: { executionMode: ExtensionMode } };

// RPC message

type ExtensionMode = "docker" | "nix";

type PrefetchTestTreeParams = {
  workspaces: Array<Workspace>;
};

type BuildTestTreeParams = {
  mode: ExtensionMode;
  workspace: Workspace;
  packageName: string;
  suiteName: string;
};

type RunTestsParams = {
  mode: ExtensionMode;
  workspace: Workspace;
  testIds: Array<RunTestId>;
};

type TestEventType = "test-suite-update" | "test-update" | "test-context";

type TestEvent = {
  eventType: TestEventType;
  payload: unknown;
};

type TestSuiteUpdateEvent = TestEvent & {
  eventType: "test-suite-update";
  payload: {
    workspaceId: string;
    packageName: string;
    suiteName: string;
    runStatus: "idle" | "running" | "done";
    tests?: Array<Test>;
    coverage?: Array<FileCoverage>;
  };
};

type TestUpdateEvent = TestEvent & {
  eventType: "test-update";
  payload: {
    id: TestId;
    status?: RunStatus;
    time?: number;
    percentage?: number;
  };
};

type TestContextEvent = TestEvent & {
  eventType: "test-context";
  payload: {
    id: TestId;
    coverage: Array<FileCoverage>;
  };
};

// Errors

type ScriptExecutionErrorData = {
  kind: 'script-execution-error';
  scriptPath: string;
  params: Array<string>;
  exitCode: number | null;
  stderr: string;
  stdout: string;
};

type BuildTestTreeErrorData = ScriptExecutionErrorData & {
  runParams: BuildTestTreeParams;
};

type RunTestsErrorData = ScriptExecutionErrorData & {
  runParams: RunTestsParams & { testRun: TestRun };
};

type DependencyError = {
  hasError: boolean;
  message: string;
};
