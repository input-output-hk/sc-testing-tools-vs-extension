import * as rpc from 'vscode-jsonrpc/node';

import { runBuildScript, ScriptExecutionError } from '../../utils/runScript';
import { parseTestSuiteBuildEvent, TestEventValidationError } from '../../utils/parseTestEvent';

export const handleTestSuiteBuild = async (connection: rpc.MessageConnection, job: RpcBuildJob): Promise<void> => {
  try {
    for await (const output of runBuildScript(job.params.mode, job.params.workspace.path, job.params.packageName, job.params.suiteName)) {
      try {
        const testEvent = parseTestSuiteBuildEvent(
          job.params.workspace.id,
          job.params.packageName,
          job.params.suiteName,
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
    sendTestEvent(connection, buildErrorEvent(job, error));
  }
};

const handleParseError = (error: unknown): void => {
  if (error instanceof TestEventValidationError) {
    console.error('Test event parsing failed:', error.data);
  } else {
    console.error('Test event parsing failed:', error instanceof Error ? error.message : String(error));
  }
};

const buildErrorEvent = (job: RpcJob, error: unknown): TestRunErrorEvent => {
  if (error instanceof ScriptExecutionError) {
    return {
      eventType: 'test-run-error',
      payload: { job, error: error.data }
    };
  }

  return {
    eventType: 'test-run-error',
    payload: {
      job,
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
