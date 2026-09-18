// Test

type RunStatus = "undetermined" | "valid" | "invalid";

type RunStatusContext = {
  status: RunStatus;
  isWaiting: boolean;
  isRunning: boolean;
};

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
  isWaiting: boolean;
  isRunning: boolean;
  isStatic: boolean;
  location?: TestLocation;
  time?: number;
  percentage?: number;
  type?: TestType;
  lastRunId?: string;
  hasCoverage?: boolean;
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

// Generic Test Tree

type GenericMap<T> = Record<string, T>;

type GenericTestTree<T> = {
  packages: GenericMap<T>;
};

type GenericTestPackage<T> = {
  id: TestPackageId;
  name: string;
  packagePath: string;
  workspace: Workspace;
  suites: GenericMap<T>;
  isOpen: boolean;
};

type GenericTestSuite<T> = {
  id: TestSuiteId;
  name: string;
  status: RunStatus;
  isWaiting: boolean;
  isRunning: boolean;
  isStatic: boolean;
  time?: number;
  isOpen: boolean;
  tests: GenericMap<T>;
};

// Prefetch Test Tree

type StaticTestTree = GenericTestTree<StaticTestPackage>;

type StaticTestPackage = GenericTestPackage<StaticTestSuite>;

type StaticTestSuite = GenericTestSuite<Test> & {
  isStatic: boolean = true;
};

// Test Tree

type TestTree = GenericTestTree<TestPackage>;

type TestPackage = GenericTestPackage<TestSuite>;

type TestSuite = GenericTestSuite<TestTreeNode> & {
  isStatic: boolean = false;
};

type TestTreeNode = {
  type: "group" | "test";
};

type TestTreeNodeMap = GenericMap<TestTreeNode>;

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

type TestTreeItem =
  | { type: 'package'; packageId: TestPackageId; packageNode: TestPackage; }
  | { type: 'suite'; suiteId: TestSuiteId; suiteNode: TestSuite; }
  | { type: 'node'; node: TestTreeNode; };

type TestTreeFilter = {
  text?: string;
  type?: TestType;
  status?: RunStatus;
}

type SortBy = "id" | "status" | "location";

// Test Result

type TestRoundType = "positive" | "negative" | "threat-model";

type TestRoundStatus = "success" | "failure" | "discarded";

type TestRound = {
  id: number;
  testId: TestId;
  type: TestRoundType;
  status: TestRoundStatus;
};

type TransitionTestRound = TestRound & {
  type: "positive" | "negative";
  transitions: Array<TestTransition>;
};

type ThreatModelTestRound = TestRound & {
  type: "threat-model";
  traces: Array<ThreatModelTrace>;
};

type TestRoundData = {
  transitions?: Array<TestTransition>;
  traces?: Array<ThreatModelTrace>;
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

type ThreatModelOutcome =
{
  status: "passed";
} | {
  reason: string;
  status: "failed";
} | {
  reason: string;
  status: "skipped";
} | {
  reason: string;
  status: "skipped_phase1";
} | {
  message: string;
  status: "error";
};

type TxAddressType = "public-key" | "script";

type Tx = {
  id?: string;
  fee: number;
  inputs: Array<TxInput>;
  outputs: Array<TxOutput>;
  mint?: TxValue;
  signers?: Array<string>;
  withdrawals: Array<TxWithdrawal>;
};

type TxInput = {
  address: string;
  addressLabel?: string;
  addressType: TxAddressType;
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
  addressLabel?: string;
  addressType: TxAddressType;
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

type TxWithdrawal = {
  addressLabel?: string;
  addressType: TxAddressType;
  amount: number;
  redeemerConstr?: number;
  redeemerKind?: string;
  redeemerPayload?: unknown;
  redeemerRaw?: string;
  stakeAddress: string;
};

type TxMod =
{
  type: "removeInput";
  utxo: string;
} | {
  index: number;
  type: "removeOutput";
} | {
  address: string | null;
  addressLabel: string | null;
  addressType: TxAddressType | null;
  datum: string | null;
  index: number;
  referenceScript: string | null;
  type: "changeOutput";
  value: TxValue | null;
} | {
  address: string | null;
  addressLabel: string | null;
  addressType: TxAddressType | null;
  datum: string | null;
  referenceScript: string | null;
  type: "changeInput";
  utxo: string;
  value: TxValue | null;
} | {
  datum: string | null;
  redeemer: string | null;
  referenceScript: string | null;
  type: "changeScriptInput";
  utxo: string;
  value: TxValue | null;
} | {
  lowerBound: string | null;
  type: "changeValidityRange";
  upperBound: string | null;
} | {
  address: string;
  addressLabel: string | null;
  addressType: TxAddressType;
  datum: string | null;
  referenceScript: string;
  type: "addOutput";
  value: TxValue;
} | {
  address: string;
  addressLabel: string | null;
  addressType: TxAddressType;
  datum: string | null;
  isReferenceInput: boolean;
  referenceScript: string;
  type: "addInput";
  value: TxValue;
} | {
  datum: string | null;
  redeemer: string;
  scriptHash: string;
  type: "addReferenceScriptInput";
  value: TxValue;
} | {
  datum: string | null;
  redeemer: string;
  referenceScript: string;
  type: "addPlutusScriptInput";
  value: TxValue;
} | {
  datum: string | null;
  referenceScript: string;
  type: "addPlutusScriptReferenceInput";
  value: TxValue;
} | {
  isReferenceInput: boolean;
  referenceScript: string;
  type: "addSimpleScriptInput";
  value: TxValue;
} | {
  assetName: string;
  quantity: number;
  redeemer: string;
  type: "addPlutusScriptMint";
} | {
  keyHash: string;
  type: "removeRequiredSigner";
} | {
  type: "replaceTx";
};

// Test Graph

type GraphMode = "result-graph" | "attack-timeline";
type GraphStatus = "success" | "failure";

type GraphNode = {
  type: "tx" | "wallet" | "script" | "withdrawal";
  identifier: string;
  label: string;
};

type GraphNodeValue<T> = {
  current: T;
  previous?: T;
};

type GraphNodeTx = GraphNode & {
  type: "tx";
  status: GraphStatus;
  inputCount: number;
  outputCount: number;
  withdrawalCount: number;
  id: GraphNodeValue<string>;
  mint: GraphNodeValue<TxValue|undefined>;
  fee: GraphNodeValue<number>;
  signers: GraphNodeValue<Array<string>|undefined>;
};

type GraphNodeUTxO = GraphNode & {
  type: "wallet" | "script" | "withdrawal";
  consumed: boolean;
  address?: GraphNodeValue<string>;
  stakeAddress?: GraphNodeValue<string>;
  utxo?: GraphNodeValue<string>;
  value?: GraphNodeValue<TxValue>;
  amount?: GraphNodeValue<number>;
  redeemer?: GraphNodeValue<string|undefined>;
  datum?: GraphNodeValue<string|undefined>;
};

type GraphTx = {
  tx: GraphNodeTx;
  inputs: Array<GraphNodeUTxO>;
  outputs: Array<GraphNodeUTxO>;
  withdrawals: Array<GraphNodeUTxO>;
};

// Test History

type TestRunHistory = {
  runId: string;
  status: TestJobStatus;
  startedOn: number;
  finishedOn?: number;
  tests: Array<TestResultHistory>;
};

type TestResultHistory = {
  id: TestId;
  type?: TestType;
  status: RunStatus;
  group: Array<string>;
  time?: number;
};

// Coverage

type CoverageStatements = GenericMap<Array<string>>;

type TestEventCoverageMap = GenericMap<TestEventCoverage>;

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

type CoverageTree = GenericMap<CoverageTreeNode>;

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

// Webview Message

type TestTreeUpdate =
| { type: 'test', test: Test }
| { type: 'suite', suite: TestTreeSuiteUpdate };

type TestTreePackageUpdate = {
  packageId: TestPackageId;
  suites: Array<TestTreeSuiteUpdate>;
  isOpen: boolean;
};

type TestTreeSuiteUpdate = {
  suiteId: TestSuiteId;
  name?: string;
  status?: RunStatus;
  isWaiting?: boolean;
  isRunning?: boolean;
  isStatic?: boolean;
  time?: number;
  tests?: TestTreeNodeMap;
  isOpen?: boolean;
};

type TestTreeUpdateOpenState = {
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

type CoverageScope =
  | { type: "all" }
  | { type: "test", testId: TestId, testName: string };

type TestResult = {
  test: Test;
  rounds: Array<TestRound>;
};

type ExtensionToWebviewMessage =
  | { type: "test-tree", payload: { testTree: TestTree } }
  | { type: "test-tree-update", payload: TestTreeUpdate }
  | { type: "test-tree-test-run-update", payload: { job: TestJob | null } }
  | { type: "test-tree-error" }
  | { type: "test-result", payload: TestResult }
  | { type: "coverage-tree", payload: { coverageTree: CoverageTree, scope: CoverageScope } }
  | { type: "config-execution-mode", payload: { executionMode: ExtensionMode } }
  | { type: "config-test-rounds", payload: { rounds: number } }
  | { type: "status-missing-dependency", payload: { error: DependencyError } }
  | { type: "status-empty-workspaces" }
  | { type: "test-tree-set-sort", payload: { sortBy: SortBy } };

type WebviewToExtensionMessage =
  | { type: "webview-ready" }
  | { type: "test-tree-fetch" }
  | { type: "test-tree-open-folder" }
  | { type: "test-tree-open-results", payload: { testId: TestId } }
  | { type: "test-tree-show-location", payload: { testId: TestId } }
  | { type: "test-tree-show-coverage", payload: { testId: TestId, testName: string } }
  | { type: "test-tree-run", payload: { testIds: Array<RunnableTestId> } }
  | { type: "test-tree-update-open-state", payload: TestTreeUpdateOpenState }
  | { type: "test-tree-build-suite", payload: { suiteId: TestSuiteId } }
  | { type: "coverage-show-all" }
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

// Test Job

type TestJobStatus = "waiting" | "running" | "success" | "failed";
type TestJobType = "run" | "build";

type TestJob = {
  id: string;
  type: TestJobType;
  status: TestJobStatus;
  startedOn?: number;
  finishedOn?: number;
  isLast?: boolean;
  params: unknown;
};

type TestBuildJob = TestJob & {
  type: 'build';
  params: TestSuiteBuildParams;
};

type TestRunJob = TestJob & {
  type: 'run';
  params: TestRunParams;
};

// Test Event

type TestEventType = "test-suite-update" | "test-update" | "test-context" | "test-run-update" | "test-run-error";

type TestEvent = {
  eventType: TestEventType;
  testJobId: string;
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
    isRunning?: boolean;
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

type TestRunUpdateEvent = TestEvent & {
  eventType: "test-run-update";
  payload: {
    job: TestJob;
  };
};

type TestRunErrorEvent = TestEvent & {
  eventType: "test-run-error";
  payload: {
    job: TestJob;
    failedTestRun?: TestRun;
    error: ScriptExecutionErrorData;
  };
};

// Errors

type ScriptExecutionErrorData = {
  scriptPath: string;
  params: Array<string>;
  exitCode: number | null;
  stderr: string;
  stdout: string;
};

type DependencyErrorCode = "no-dependencies" | "nix-not-detected" | "docker-not-detected" | "docker-connection";

type DependencyError = {
  hasError: boolean;
  message: string;
  code?: DependencyErrorCode;
};
