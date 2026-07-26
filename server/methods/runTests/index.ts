import Ajv, { ValidateFunction } from "ajv";
import * as rpc from 'vscode-jsonrpc/node';

import { runRunScript, ScriptExecutionError } from './runScript';
import { SCToolsStreamingEvent } from '../../../shared/streaming-events';
import streamingEventSchema from "./streaming-events.schema.json";

export default class TestRunMethod {

  private connection: rpc.MessageConnection;

  private ajv: Ajv;
  private validate: ValidateFunction<SCToolsStreamingEvent>;

  constructor(connection: rpc.MessageConnection) {
    this.connection = connection;

    const runTestsNotification = new rpc.NotificationType<RunTestsParams>('runTests');
    this.connection.onNotification(runTestsNotification, this.runTests.bind(this));

    this.ajv = new Ajv();
    this.ajv.addFormat("double", true);
    this.validate = this.ajv.compile<SCToolsStreamingEvent>(streamingEventSchema);
  }

  private toResultId(params: RunTestsParams, event: SCToolsStreamingEvent): string {
    const maybeId = (event as { id?: unknown }).id;
    if (typeof maybeId === 'number') {
      return `${params.packageName}:${params.suiteName}:${maybeId}`;
    }
    return `${params.packageName}:${params.suiteName}`;
  }

  private async *run(params: RunTestsParams): AsyncGenerator<TestResult> {
    const testIds = params.testIds ?? [];
    for await (const result of runRunScript(params.mode, params.workspacePath, params.packageName, params.suiteName, testIds)) {
      const testEvent = result.parsed
      if (this.validate(testEvent)) {
        yield {
          id: this.toResultId(params, testEvent),
          event: testEvent,
          error: undefined
        };
      } else {
        yield {
          rawEvent: testEvent,
          error: this.ajv.errorsText(this.validate.errors)
        }
      }
    }
  }

  private runTests(params: RunTestsParams): void {
    (async () => {
      try {
        let sawSuiteDone = false;
        let sawSuiteStarted = false;
        let sawEvent = false;

        for await (const result of this.run(params)) {
          if (result.error === undefined) {
            sawEvent = true;
            if (result.event.event === 'suite_started') {
              sawSuiteStarted = true;
            }
            if (result.event.event === 'suite_done') {
              sawSuiteDone = true;
            }
          }

          this.sendTestResult(result);
        }

        if (!sawSuiteDone) {
          this.sendRunTestsError(this.buildIncompleteRunError(params, sawEvent, sawSuiteStarted));
        }
      } catch (error) {
        this.sendRunTestsError(this.buildRunTestsError(error, params));
      }
    })();
  };

  private buildIncompleteRunError(
    params: RunTestsParams,
    sawEvent: boolean,
    sawSuiteStarted: boolean
  ): RunTestsErrorData {
    const runContext = {
      packageName: params.packageName,
      suiteName: params.suiteName,
      testIds: params.testIds ?? [],
    };

    let message = 'Run finished without any streaming events.';
    if (sawSuiteStarted) {
      message = 'Run ended after suite_started but before suite_done.';
    } else if (sawEvent) {
      message = 'Run ended without suite_done event.';
    }

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

  private buildRunTestsError(error: unknown, params: RunTestsParams): RunTestsErrorData {
    const runContext = {
      packageName: params.packageName,
      suiteName: params.suiteName,
      testIds: params.testIds ?? [],
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