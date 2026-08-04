import * as rpc from 'vscode-jsonrpc/node';

import { runBuildScript, ScriptExecutionError } from '../../utils/runScript';
import { parseBuildTestTreeEvent, TestEventValidationError } from '../../utils/parseTestEvent';

export default class BuildTestTreeMethod {

  private connection: rpc.MessageConnection;

  constructor(connection: rpc.MessageConnection) {
    this.connection = connection;

    const buildTestTreeNotification = new rpc.NotificationType<BuildTestTreeParams>('buildTestTree');
    this.connection.onNotification(buildTestTreeNotification, this.buildTestTree.bind(this));
  }

  private async buildTestTree(params: BuildTestTreeParams): Promise<void> {
    try {
      for await (const output of runBuildScript(params.mode, params.workspace.path, params.packageName, params.suiteName)) {
        try {
          const testEvent = parseBuildTestTreeEvent(
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
      this.sendBuildTestTreeError(this.buildScriptExecutionError(error, params));
    }
  }

  private handleParseError(error: unknown): void {
    if (error instanceof TestEventValidationError) {
      console.error('Test event parsing failed:', error.data);
    } else {
      console.error('Test event parsing failed:', error instanceof Error ? error.message : String(error));
    }
  }

  private buildScriptExecutionError(error: unknown, params: BuildTestTreeParams): BuildTestTreeErrorData {
    if (error instanceof ScriptExecutionError) {
      return { ...error.data, runParams: params };
    }

    return {
      kind: 'script-execution-error',
      scriptPath: '',
      params: [],
      exitCode: null,
      stderr: error instanceof Error ? error.message : String(error),
      stdout: '',
      runParams: params,
    };
  }

  private sendBuildTestTreeError(data: BuildTestTreeErrorData): void {
    this.connection.sendNotification('buildTestTreeError', data);
  }

  private sendTestEvent(event: TestEvent): void {
    this.connection.sendNotification('testEvent', event);
  }
}
