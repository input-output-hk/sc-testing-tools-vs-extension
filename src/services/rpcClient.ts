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

  public async listTests(): Promise<TestPackageData> {
    const request = new rpc.RequestType<ListTestsParams, ListTestsResult, void>('listTests');
    const workspacePaths = vscode.workspace.workspaceFolders?.map(folder => folder.uri.fsPath) || [];
    return await this.connection.sendRequest(request, { workspacePaths });
  }

  public runTests(params: RunTestsParams): void {
    const notification = new rpc.NotificationType<RunTestsParams>('runTests');
    this.connection.sendNotification(notification, params);
  }

  private buildRunTestsErrorLog(error: RunTestsErrorData): string {
    const { packageName, suiteName, testIds } = error.runContext;
    const exitCode = error.exitCode === null ? 'unknown' : String(error.exitCode);
    const commandOutput = error.stderr.trim() || error.stdout.trim();
    const details = commandOutput.length > 0 ? `: ${commandOutput}` : '';
    const testIdLabel = testIds.length > 0 ? `[${testIds.join(',')}]` : '[all tests]';
    return `runTests failed for ${packageName}/${suiteName} ${testIdLabel} (exit code ${exitCode})${details}`;
  }
}
