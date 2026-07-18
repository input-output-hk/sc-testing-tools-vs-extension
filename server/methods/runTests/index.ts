import * as rpc from 'vscode-jsonrpc/node';

import runScript from './runScript';
import { ScriptExecutionError } from '../../utils/runScript';

export default class TestRunMethod {

  private connection: rpc.MessageConnection;

  constructor(connection: rpc.MessageConnection) {
    this.connection = connection;

    const runTestsNotification = new rpc.NotificationType<RunTestsParams>('runTests');
    this.connection.onNotification(runTestsNotification, this.runTests.bind(this));
  }

  private runTests(params: RunTestsParams): void {
    (async () => {
      try {
        for await (const result of runScript(params)) {
          this.sendTestResult(result);
        }
      } catch (error) {
        this.sendRunTestsError(this.buildRunTestsError(error, params));
      }
    })();
  };

  private buildRunTestsError(error: unknown, params: RunTestsParams): RunTestsErrorData {
    const runContext = {
      packageName: params.packageName,
      suiteName: params.suiteName,
      testIds: params.testIds,
    };

    if (error instanceof ScriptExecutionError) {
      return {
        ...error.data,
        runContext,
      };
    }

    const message = error instanceof Error ? error.message : String(error);
    return {
      kind: 'script-execution-error',
      scriptPath: '',
      params: [],
      exitCode: null,
      stderr: message,
      stdout: '',
      runContext,
    };
  }

  public sendTestResult(result: TestResult): void {
    this.connection.sendNotification('testResult', result);
  };

  public sendRunTestsError(error: RunTestsErrorData): void {
    this.connection.sendNotification('runTestsError', error);
  }

}