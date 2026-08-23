import * as rpc from 'vscode-jsonrpc/node';

import { runRunScript, ScriptExecutionError } from '../../utils/runScript';
import { parseTestEvent, TestEventValidationError } from '../../utils/parseTestEvent';

export default class TestRunMethod {

  private connection: rpc.MessageConnection;

  constructor(connection: rpc.MessageConnection) {
    this.connection = connection;

    const testRunNotification = new rpc.NotificationType<TestRunParams>('testRun');
    this.connection.onNotification(testRunNotification, this.testRun.bind(this));
  }

  private getTestRuns(workspace: Workspace, testIds: Array<RunnableTestId>): Array<TestRun> {
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

  private async testRun(params: TestRunParams): Promise<void> {
    for (const testRun of this.getTestRuns(params.workspace, params.testIds)) {
      try {
        for await (const output of runRunScript(params.mode, params.workspace.path, testRun.packageName, testRun.suiteName, testRun.testIds)) {
          try {
            const testEvent = parseTestEvent(
              params.workspace.id,
              testRun.packageName,
              testRun.suiteName,
              testRun.testIds !== undefined && testRun.testIds.length > 0,
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
        this.sendTestEvent(this.buildErrorEvent(error, { ...params, testRun }));
      }
    }
  }

  private handleParseError(error: unknown): void {
    if (error instanceof TestEventValidationError) {
      console.error('Test event parsing failed:', error.data);
    } else {
      console.error('Test event parsing failed:', error instanceof Error ? error.message : String(error));
    }
  }

  private buildErrorEvent(error: unknown, params: TestRunParams & { testRun: TestRun }): TestRunErrorEvent {
    if (error instanceof ScriptExecutionError) {
      return {
        eventType: 'test-run-error',
        payload: { ...error.data, runParams: params }
      };
    }

    return {
      eventType: 'test-run-error',
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
