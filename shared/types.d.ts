
type Test = {
  id: number;
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

type TestList = Record<number, Test>;

type TestTree = Record<string, TreeNode>;

type TestSuite = {
  testList: TestList;
  testTree: TestTree;
};

type TreeNode = {
  type: "group" | "test";
};

type TreeGroupNode = TreeNode & {
  type: "group";
  name: string;
  isOpen: boolean;
  nodes: TestTree;
};

type TreeTestNode = TreeNode & {
  type: "test";
  testId: number;
};

type ExtensionToWebviewMessage =
  | { type: "test-suite", payload: TestSuite }
  | { type: "test-update", payload: { test: Test } };

type WebviewToExtensionMessage =
  | { type: "webview-ready" }
  | { type: "build-test-suite" }
  | { type: "update-test-tree", payload: { testTree: TestTree } }
  | { type: "run-test", payload?: { testIds: Array<number> } };
