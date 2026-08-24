import * as rpc from 'vscode-jsonrpc/node';

import { runBuildScript, ScriptExecutionError } from '../../utils/runScript';
import { parseTestSuiteBuildEvent, TestEventValidationError } from '../../utils/parseTestEvent';

export default class TestSuiteBuildMethod {

  private connection: rpc.MessageConnection;

  constructor(connection: rpc.MessageConnection) {
    this.connection = connection;

    const testSuiteBuildNotification = new rpc.NotificationType<TestSuiteBuildParams>('testSuiteBuild');
    this.connection.onNotification(testSuiteBuildNotification, this.testSuiteBuild.bind(this));
  }

  private async testSuiteBuild(params: TestSuiteBuildParams): Promise<void> {
    try {
      for await (const output of runBuildScript(params.mode, params.workspace.path, params.packageName, params.suiteName)) {
        try {
          const testEvent = parseTestSuiteBuildEvent(
            params.workspace.id,
            params.packageName,
            params.suiteName,
            output
          );
          if (testEvent !== null) {
            this.sendTestEvent(testEvent);
          }
        } catch (error) {
          this.handleParseError(error);
        }
      }
    } catch (error) {
      this.sendTestEvent(this.buildErrorEvent(error, params));
    }
  }

  private handleParseError(error: unknown): void {
    if (error instanceof TestEventValidationError) {
      console.error('Test event parsing failed:', error.data);
    } else {
      console.error('Test event parsing failed:', error instanceof Error ? error.message : String(error));
    }
  }

  private buildErrorEvent(error: unknown, params: TestSuiteBuildParams): TestSuiteBuildErrorEvent {
    if (error instanceof ScriptExecutionError) {
      return {
        eventType: 'test-build-error',
        payload: { ...error.data, runParams: params }
      };
    }

    return {
      eventType: 'test-build-error',
      payload: {
        kind: 'script-execution-error',
        scriptPath: '',
        params: [],
        exitCode: null,
        stderr: error instanceof Error ? error.message : String(error),
        stdout: '',
        runParams: params,
      }
    };
  }

  private sendTestEvent(event: TestEvent): void {
    this.connection.sendNotification('testEvent', event);
  }
}
