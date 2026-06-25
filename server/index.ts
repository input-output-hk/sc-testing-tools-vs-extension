import * as rpc from 'vscode-jsonrpc/node';

import { runScript } from './services/runScript';

// TODO: Split this into multiple files for handling test list and test run functionality

interface TestListResult {
  event: 'suite_started';
  tests: Array<TestListItem>;
}

interface TestListItem {
  id: number;
  name: string;
  path: Array<string>;
  srcLoc: {
    file: string;
    endCol: number;
    endLine: number;
    startCol: number;
    startLine: number;
  };
};

function isTestListResult(value: unknown): value is TestListResult {
  return typeof value === 'object' && value !== null && value.hasOwnProperty('event') && (value as TestListResult).event === 'suite_started';
}

const buildTestList = async (): Promise<Array<Test>> => {
  const testList: Array<Test> = [];
  for await (const output of runScript('list-tests-json.sh')) {
    if (isTestListResult(output.parsed)) {
      const result = output.parsed as TestListResult;
      for (const testItem of result.tests) {
        testList.push({
          id: testItem.id,
          name: testItem.name,
          group: testItem.path,
          location: {
            uri: testItem.srcLoc.file,
            startLine: testItem.srcLoc.startLine,
            startCharacter: testItem.srcLoc.startCol,
            endLine: testItem.srcLoc.endLine,
            endCharacter: testItem.srcLoc.endCol,
          },
          status: 'undetermined',
        });
      }
    }
  }
  return testList;
};

interface TestRun {
  id: number;
  event: 'test_done';
  success: boolean;
  duration: number;
}

interface TestResult {
  id: number;
  status: TestStatus;
  time: number;
}

function isTestRun(value: unknown): value is TestRun {
  return typeof value === 'object' && value !== null && value.hasOwnProperty('event') && (value as TestRun).event === 'test_done';
}

// TODO: Handle coverage
const runTest = (testIds: number[]): void => {
  (async () => {
    for await (const output of runScript('run-tests-json.sh')) {
      if (isTestRun(output.parsed)) {
        const result = output.parsed as TestRun;
        sendTestResult({
          id: result.id,
          status: result.success ? 'valid' : 'invalid',
          time: result.duration * 1000,
        });
      }
    }
  })();
};

const sendTestResult = (result: TestResult): void => {
  connection.sendNotification('testResult', result);
};

const connection = rpc.createMessageConnection(
  new rpc.StreamMessageReader(process.stdin),
  new rpc.StreamMessageWriter(process.stdout)
);

const buildTestListRequest = new rpc.RequestType<void, Array<Test>, void>('buildTestList');
connection.onRequest(buildTestListRequest, buildTestList);

const runTestNotification = new rpc.NotificationType<number[]>('runTest');
connection.onNotification(runTestNotification, runTest);

connection.listen();