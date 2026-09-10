import { ScriptExecutionError } from '../../utils/runScript';
import { TestEventValidationError } from '../../utils/parseTestEvent';
import type RpcServer from '../../index';

export const getTestRuns = (workspace: Workspace, testIds: Array<RunnableTestId>): Array<TestRun> => {
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
};

export const handleParseError = (error: unknown): void => {
  if (error instanceof TestEventValidationError) {
    console.error('Test event parsing failed:', error.data);
  } else {
    console.error('Test event parsing failed:', error instanceof Error ? error.message : String(error));
  }
};

export const buildErrorEvent = (job: TestJob, error: unknown, failedTestRun?: TestRun): TestRunErrorEvent => {
  if (error instanceof ScriptExecutionError) {
    return {
      eventType: 'test-run-error',
      payload: {
        job,
        failedTestRun,
        error: error.data
      }
    };
  }

  return {
    eventType: 'test-run-error',
    payload: {
      job,
      failedTestRun,
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

export const sendTestRunUpdate = (
  server: RpcServer,
  job: TestJob,
  status: TestJobStatus,
  startedOn?: number,
  finishedOn?: number,
): void => {
  sendTestEvent(server, {
    eventType: 'test-run-update',
    payload: {
      job: {
        ...job,
        status,
        startedOn,
        finishedOn,
        isLast: server.getQueueCount() <= 0,
      }
    }
  });
};

export const sendTestEvent = (server: RpcServer, event: TestEvent): void => {
  server.getConnection().sendNotification('testEvent', event);
};