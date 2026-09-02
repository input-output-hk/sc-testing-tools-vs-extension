import * as rpc from 'vscode-jsonrpc/node';

import { runRunScript, ScriptExecutionError } from '../../utils/runScript';
import { parseTestEvent, TestEventValidationError } from '../../utils/parseTestEvent';

export const handleTestRun = async (connection: rpc.MessageConnection, job: RpcRunJob): Promise<void> => {
  for (const testRun of getTestRuns(job.params.workspace, job.params.testIds)) {
    try {
      for await (const output of runRunScript(job.params.mode, job.params.workspace.path, testRun.packageName, testRun.suiteName, testRun.testIds)) {
        try {
          const testEvent = parseTestEvent(
            job.params.workspace.id,
            testRun.packageName,
            testRun.suiteName,
            testRun.testIds !== undefined && testRun.testIds.length > 0,
            output
          );
          if (testEvent !== null) {
            sendTestEvent(connection, testEvent);
          }
        } catch (error) {
          handleParseError(error);
        }
      }
    } catch (error) {
      sendTestEvent(connection, buildErrorEvent(job, testRun, error));
    }
  }
};

const getTestRuns = (workspace: Workspace, testIds: Array<RunnableTestId>): Array<TestRun> => {
  const testRunsMap: Map<string, Array<string>> = new Map();
  for (const id of testIds) {
    const [_, packageName, suiteName, testId] = id;
    const key = `${packageName}:${suiteName}`;
    if (!testRunsMap.has(key)) testRunsMap.set(key, []);
    if (testId !== undefined) testRunsMap.get(key)!.push(testId);
  }
  const testRuns: Array<TestRun> = [];
  for (const [key, testIds] of testRunsMap) {
    const [packageName, suiteName] = key.split(':');
    testRuns.push({
      packageName,
      suiteName,
      workspaceId: workspace.id,
      testIds: testIds.length > 0 ? testIds : undefined
    });
  }
  return testRuns;
}

const handleParseError = (error: unknown): void => {
  if (error instanceof TestEventValidationError) {
    console.error('Test event parsing failed:', error.data);
  } else {
    console.error('Test event parsing failed:', error instanceof Error ? error.message : String(error));
  }
};

const buildErrorEvent = (job: RpcJob, testRun: TestRun, error: unknown): TestRunErrorEvent => {
  if (error instanceof ScriptExecutionError) {
    return {
      eventType: 'test-run-error',
      payload: { job, failedTestRun: testRun, error: error.data }
    };
  }

  return {
    eventType: 'test-run-error',
    payload: {
      job,
      failedTestRun: testRun,
      error: {
        scriptPath: '',
        params: [],
        exitCode: null,
        stderr: error instanceof Error ? error.message : String(error),
        stdout: '',
      }
    }
  };
};

const sendTestEvent = (connection: rpc.MessageConnection, event: TestEvent): void => {
  connection.sendNotification('testEvent', event);
};
