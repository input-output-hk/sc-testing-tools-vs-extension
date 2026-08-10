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

// Test Result

type TestRound = {
  id: number;
  status: TestRoundStatus;
  transitions: Array<TestTransition>;
};

type TestRoundStatus = {
  status: "success";
} | {
  status: "failure";
  message: string;
} | {
  status: "discarded";
  message: string;
};

type TestTransition = {
  action: string;
  result: TestTransitionResult;
  stepIndex: number;
  tx?: TestTx;
};

type TestTransitionResult = {
  status: "success";
  txId: string;
} | {
  status: "failure";
  error: string;
};

type TestTx = {
  id?: string;
  fee: number;
  inputs: Array<TxInput>;
  outputs: Array<TxOutput>;
  mint?: TxValue;
  signers?: Array<string>;
};

type TxInput = {
  address: string;
  utxo: string;
  value: TxValue;
  redeemerConstr?: number;
  redeemerKind?: string;
  redeemerPayload?: unknown;
  redeemerRaw?: string;
};

type TxOutput = {
  address: string;
  utxo: string;
  value: TxValue;
  datum?: string;
};

type TxValue = {
  lovelace: number;
  assets: Array<TxAsset>;
};

type TxAsset = {
  name: string;
  policyId: string;
  quantity: number;
};

// Coverage

type CoverageStatements = Record<string, Array<string>>;

type TestEventCoverageMap = Record<string, TestEventCoverage>;

type TestEventCoverage = {
  workspaceId: string;
  packageName: string;
  suiteName: string;
  fileUri: string;
  statements: CoverageStatements;
};

type FileCoverage = {
  fileHash: string;
  filePath: string;
  context: FileCoverageContext;
  statements: CoverageStatements;
};

type FileCoverageContext = {
  basePath: string;
  workspaceId: string;
  packageName: string;
  suiteName: string;
};

type FileCoverageWithStats = FileCoverage & {
  stats: {
    total: number;
    covered: number;
  };
};

// Webview message

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

type TestResult = {
  test: Test;
  rounds: Array<TestRound>;
};

type TestResultWithGroupTests = TestResult & {
  groupTests: Array<Test>;
};

type ExtensionToWebviewMessage =
  | { type: "test-tree", payload: { testTree: TestTree } }
  | { type: "test-update", payload: { test: Test } }
  | { type: "test-suite-update", payload: TestSuiteUpdate }
  | { type: "test-suite-status-update", payload: TestSuiteStatusUpdate }
  | { type: "test-result", payload: TestResultWithGroupTests }
  | { type: "execution-mode-config", payload: { executionMode: ExtensionMode } }
  | { type: "test-rounds-config", payload: { rounds: number } }
  | { type: "dependency-status", payload: { error: DependencyError } }
  | { type: "empty-workspaces" }
  | { type: "test-tree-error" };

type WebviewToExtensionMessage =
  | { type: "webview-ready" }
  | { type: "fetch-test-tree" }
  | { type: "open-folder" }
  | { type: "run-test" }
  | { type: "run-tests", payload: { testIds: Array<RunTestId> } }
  | { type: "open-test-results", payload: { testId: TestId } }
  | { type: "select-test", payload: { testId: TestId } }
  | { type: "update-test-tree", payload: TestTreeUpdate }
  | { type: "update-execution-mode", payload: { executionMode: ExtensionMode } }
  | { type: "update-test-rounds", payload: { rounds: number } };

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
    coverage?: Array<TestEventCoverage>;
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
    coverage: Array<TestEventCoverage>;
    round: TestRound;
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

type DependencyErrorCode = 'no-dependencies' | 'nix-not-detected' | 'docker-not-detected' | 'docker-connection';

type DependencyError = {
  hasError: boolean;
  message: string;
  code?: DependencyErrorCode;
};
