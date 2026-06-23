
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

type ExtensionToWebviewMessage =
  | { type: "test-list", payload: { testList: Array<Test> } }
  | { type: "test-result", payload: { test: Test } };

type WebviewToExtensionMessage =
  | { type: "webview-ready" }
  | { type: "build-test-list" }
  | { type: "run-test", payload?: { testIds: Array<number> } };
