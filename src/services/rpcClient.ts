import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as rpc from 'vscode-jsonrpc/node';

import { PbtContext } from '../extension';
  
export default class RpcClient {
  private context: PbtContext | null = null;
  private childProcess: cp.ChildProcess;
  private connection: rpc.MessageConnection;

  constructor(context: vscode.ExtensionContext) {
    this.childProcess = cp.spawn('node', [context.asAbsolutePath('out/server/index.js')]);
    
    this.connection = rpc.createMessageConnection(
      new rpc.StreamMessageReader(this.childProcess.stdout!),
      new rpc.StreamMessageWriter(this.childProcess.stdin!)
    );
  }

  public async initialize(context: PbtContext): Promise<void> {
    this.context = context;

    this.childProcess.stderr?.on('data', (data) => {
      context.outputChannel.append(`> ERROR\n${data}`);
      return data;
    });

    this.connection.trace(rpc.Trace.Verbose, {
      log: (message: string, data?: string) => {
        context.outputChannel.append(`> ${message}\n${data}`);
      }
    });

    this.connection.listen();
  }

  public onTestResult(callback: (test: TestResult) => void): void {
    this.connection.onNotification('testResult', (test: TestResult) => {
      callback(test);
    });
  }

  public onRunTestsError(callback: (error: RunTestsErrorData) => void): void {
    const notification = new rpc.NotificationType<RunTestsErrorData>('runTestsError');
    this.connection.onNotification(notification, (error: RunTestsErrorData) => {
      this.context?.outputChannel.appendLine('> ERROR');
      this.context?.outputChannel.appendLine(this.buildRunTestsErrorLog(error));
      callback(error);
    });
  }

  public async listSuites(): Promise<TestPackageList> {
    const request = new rpc.RequestType<ListSuitesParams, TestPackageList, void>('listSuites');
    const workspacePaths = vscode.workspace.workspaceFolders?.map(folder => folder.uri.fsPath) || [];
    return await this.connection.sendRequest(request, { workspacePaths });
  }

  public async listTests(params: ListTestsParams): Promise<Array<Test>> {
    const request = new rpc.RequestType<ListTestsParams, Array<Test>, ScriptExecutionErrorData>('listTests');

    try {
      return await this.connection.sendRequest(request, params);
    } catch (exception) {
      const error = this.buildListTestsError(exception);
      this.context?.outputChannel.append(`> ERROR\n${error.message}\n${error.stack}`);
      throw error;
    }
  }

  public runTests(params: RunTestsParams): void {
    const notification = new rpc.NotificationType<RunTestsParams>('runTests');
    this.connection.sendNotification(notification, params);
  }

  private buildListTestsError(error: unknown): Error {
    if (error instanceof rpc.ResponseError) {
      const responseError = error as rpc.ResponseError<ScriptExecutionErrorData>;
      const data = responseError.data;

      if (data?.kind === 'script-execution-error') {
        const exitCode = data.exitCode === null ? 'unknown' : String(data.exitCode);
        const output = data.stderr.trim() || data.stdout.trim();
        const message = output.length > 0
          ? `listTests failed (${data.scriptPath}, exit code ${exitCode}): ${output}`
          : `listTests failed (${data.scriptPath}, exit code ${exitCode})`;
        return new Error(message, { cause: error });
      }

      return new Error(responseError.message, { cause: error });
    }

    if (error instanceof Error) {
      return error;
    }

    return new Error(String(error));
  }

  private buildRunTestsErrorLog(error: RunTestsErrorData): string {
    const { packageName, suiteName, testIds } = error.runContext;
    const exitCode = error.exitCode === null ? 'unknown' : String(error.exitCode);
    const commandOutput = error.stderr.trim() || error.stdout.trim();
    const details = commandOutput.length > 0 ? `: ${commandOutput}` : '';
    return `runTests failed for ${packageName}/${suiteName} [${testIds.join(',')}] (exit code ${exitCode})${details}`;
  }
}
