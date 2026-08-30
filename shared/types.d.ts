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

type RunnableTestId = TestSuiteId | TestId;

type TestType = "unit-test" | "positive" | "negative" | "threat-model";

type Test = {
  id: TestId;
  name: string;
  group: Array<string>;
  status: RunStatus;
  location?: TestLocation;
  time?: number;
  percentage?: number;
  type?: TestType;
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
  time?: number;
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
  testId: TestId;
  type?: "positive" | "negative" | "threat-model";
  status: TestRoundStatus;
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

type TransitionTestRound = TestRound & {
  type?: "positive" | "negative";
  threatModelTestIds: Array<TestId>;
  transitions: Array<TestTransition>;
};

type ThreatModelTestRound = TestRound & {
  type: "threat-model";
  parentTestId: TestId;
  traces: Array<ThreatModelTrace>;
};

type TestTransition = {
  action: string;
  result: TestTransitionResult;
  stepIndex: number;
  tx?: Tx;
};

type TestTransitionResult = {
  status: "success";
  txId: string;
} | {
  status: "failure";
  error: string;
};

type ThreatModelTrace = {
  tx: Tx;
  modifiedTx?: Tx;
  modifications: Array<TxMod>;
  outcome: ThreatModelOutcome;
  targetTxIndex: number;
};

type ThreatModelOutcome = {
  status: "passed";
} | {
  reason: string;
  status: "failed";
} | {
  reason: string;
  status: "skipped";
} | {
  message: string;
  status: "error";
};

type Tx = {
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
  index: number;
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

type TxMod = {
  type: "removeInput";
  utxo: string;
} | {
  type: "removeOutput";
  index: number;
} | {
  type: "changeOutput";
  index: number;
  address: string | null;
  value: TxValue | null;
  datum: string | null;
  referenceScript: string | null;
} | {
  type: "changeInput";
  utxo: string;
  address: string | null;
  value: TxValue | null;
  datum: string | null;
  referenceScript: string | null;
} | {
  type: "changeScriptInput";
  utxo: string;
  value: TxValue | null;
  datum: string | null;
  redeemer: string | null;
  referenceScript: string | null;
} | {
  type: "changeValidityRange";
  lowerBound: string | null;
  upperBound: string | null;
} | {
  type: "addOutput";
  address: string;
  value: TxValue;
  datum: string | null;
  referenceScript: string;
} | {
  type: "addInput";
  address: string;
  value: TxValue;
  isReferenceInput: boolean;
  referenceScript: string;
  datum: string | null;
} | {
  type: "addReferenceScriptInput";
  value: TxValue;
  redeemer: string;
  scriptHash: string;
  datum: string | null;
} | {
  type: "addPlutusScriptInput";
  value: TxValue;
  redeemer: string;
  referenceScript: string;
  datum: string | null;
} | {
  type: "addPlutusScriptReferenceInput";
  value: TxValue;
  referenceScript: string;
  datum: string | null;
} | {
  type: "addSimpleScriptInput";
  value: TxValue;
  referenceScript: string;
  isReferenceInput: boolean;
} | {
  type: "addPlutusScriptMint";
  quantity: number;
  assetName: string;
  redeemer: string;
} | {
  type: "removeRequiredSigner";
  keyHash: string;
} | {
  type: "replaceTx";
};

// Test Graph

type GraphMode = "result-graph" | "attack-timeline";
type GraphStatus = "success" | "failure";

type GraphNode = {
  type: "tx" | "utxo";
};

type GraphNodeValue<T> = {
  current: T;
  previous?: T;
};

type GraphNodeTx = GraphNode & {
  type: "tx";
  index: number;
  mode: GraphMode;
  status: GraphStatus;
  inputCount: number;
  outputCount: number;
  id: GraphNodeValue<string>;
  mint: GraphNodeValue<TxValue|undefined>;
  fee: GraphNodeValue<number>;
  signers: GraphNodeValue<Array<string>|undefined>;
};

type GraphNodeUTxO = GraphNode & {
  type: "utxo";
  index: number;
  mode: GraphMode;
  consumed: boolean;
  address: GraphNodeValue<string>;
  utxo: GraphNodeValue<string>;
  value: GraphNodeValue<TxValue>;
  redeemer?: GraphNodeValue<string|undefined>;
  datum?: GraphNodeValue<string|undefined>;
};

type GraphTx = {
  tx: GraphNodeTx;
  inputs: Array<GraphNodeUTxO>;
  outputs: Array<GraphNodeUTxO>;
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
  total: number;
  covered: number;
};

type FileCoverageContext = {
  basePath: string;
  workspaceId: string;
  packageName: string;
  suiteName: string;
};

type CoverageTree = Record<string, CoverageTreeNode>;

type CoverageTreeNode = {
  name: string;
  total: number;
  covered: number;
};

type CoverageTreeFileNode = CoverageTreeNode & {
  path: string;
};

type CoverageTreeFolderNode = CoverageTreeNode & {
  isOpen: boolean;
  nodes: CoverageTree;
};

// Webview message

type TestSuiteTreeUpdate = {
  packageId: TestPackageId;
  suite: TestSuite;
};

type TestSuiteUpdate = {
  suiteId: TestSuiteId;
  status: RunStatus;
  time?: number;
};

type TestTreeUpdate = {
  isOpen: boolean;
  workspaceId: string;
  packageName: string;
  suiteName?: string;
  path?: Array<string>;
};

type CoverageTreeUpdate = {
  isOpen: boolean;
  path: Array<string>;
};

type TestResult = {
  test: Test;
  rounds: Array<TestRound>;
};

type ExtensionToWebviewMessage =
  | { type: "test-tree", payload: { testTree: TestTree } }
  | { type: "test-tree-update", payload: { test: Test } }
  | { type: "test-tree-suite-tree-update", payload: TestSuiteTreeUpdate }
  | { type: "test-tree-suite-update", payload: TestSuiteUpdate }
  | { type: "test-tree-error" }
  | { type: "test-result", payload: TestResult }
  | { type: "coverage-tree", payload: { coverageTree: CoverageTree } }
  | { type: "config-execution-mode", payload: { executionMode: ExtensionMode } }
  | { type: "config-test-rounds", payload: { rounds: number } }
  | { type: "status-missing-dependency", payload: { error: DependencyError } }
  | { type: "status-empty-workspaces" };

type WebviewToExtensionMessage =
  | { type: "webview-ready" }
  | { type: "test-tree-fetch" }
  | { type: "test-tree-open-folder" }
  | { type: "test-tree-open-results", payload: { testId: TestId } }
  | { type: "test-tree-show-location", payload: { testId: TestId } }
  | { type: "test-tree-run", payload: { testIds: Array<RunnableTestId> } }
  | { type: "test-tree-update", payload: TestTreeUpdate }
  | { type: "test-tree-build-suite", payload: { suiteId: TestSuiteId } }
  | { type: "coverage-tree-update", payload: CoverageTreeUpdate }
  | { type: "coverage-open-file", payload: { filePath: string } }
  | { type: "config-update-execution-mode", payload: { executionMode: ExtensionMode } }
  | { type: "config-update-test-rounds", payload: { rounds: number } };

// RPC message

type ExtensionMode = "docker" | "nix";

type PrefetchParams = {
  workspaces: Array<Workspace>;
};

type TestSuiteBuildParams = {
  mode: ExtensionMode;
  workspace: Workspace;
  packageName: string;
  suiteName: string;
};

type TestRunParams = {
  mode: ExtensionMode;
  workspace: Workspace;
  testIds: Array<RunnableTestId>;
};

type TestEventType = "test-suite-update" | "test-update" | "test-context" | "test-run-error" | "test-build-error";

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
    coverageIndex?: Array<TestEventCoverage>;
  };
};

type TestUpdateEvent = TestEvent & {
  eventType: "test-update";
  payload: {
    id: TestId;
    status?: RunStatus;
    time?: number;
    percentage?: number;
    type?: TestType;
  };
};

type TestContextEvent = TestEvent & {
  eventType: "test-context";
  payload: {
    context: {
      testId: TestId;
      type?: TestType;
    };
    rounds: Array<TestRound>;
    coverage: Array<TestEventCoverage>;
  };
};

type TestRunErrorEvent = TestEvent & {
  eventType: "test-run-error";
  payload: TestRunErrorData;
};

type TestSuiteBuildErrorEvent = TestEvent & {
  eventType: "test-build-error";
  payload: TestSuiteBuildErrorData;
};

// Errors

type ScriptExecutionErrorData = {
  kind: "script-execution-error";
  scriptPath: string;
  params: Array<string>;
  exitCode: number | null;
  stderr: string;
  stdout: string;
};

type TestSuiteBuildErrorData = ScriptExecutionErrorData & {
  runParams: TestSuiteBuildParams;
};

type TestRunErrorData = ScriptExecutionErrorData & {
  runParams: TestRunParams & { testRun: TestRun };
};

type DependencyErrorCode = "no-dependencies" | "nix-not-detected" | "docker-not-detected" | "docker-connection";

type DependencyError = {
  hasError: boolean;
  message: string;
  code?: DependencyErrorCode;
};
