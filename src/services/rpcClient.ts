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

  public async prefetchTestTree(params: PrefetchTestTreeParams): Promise<TestTree> {
    const request = new rpc.RequestType<PrefetchTestTreeParams, TestTree, void>('prefetchTestTree');
    return await this.connection.sendRequest(request, params);
  }

  public buildTestTree(params: BuildTestTreeParams): void {
    const notification = new rpc.NotificationType<BuildTestTreeParams>('buildTestTree');
    this.connection.sendNotification(notification, params);
    this.clearError();
  }

  public runTests(params: RunTestsParams): void {
    const notification = new rpc.NotificationType<RunTestsParams>('runTests');
    this.connection.sendNotification(notification, params);
    this.clearError();
  }

  public onTestEvent(callback: (event: TestEvent) => void): void {
    this.connection.onNotification('testEvent', (event: TestEvent) => {
      callback(event);
    });
  }

  public onBuildTestTreeError(callback: (error: BuildTestTreeErrorData) => void): void {
    const notification = new rpc.NotificationType<BuildTestTreeErrorData>('buildTestTreeError');
    this.connection.onNotification(notification, (error: BuildTestTreeErrorData) => {
      this.showError('Test suite build failed', this.buildBuildTestTreeErrorLog(error));
      callback(error);
    });
  }

  private buildBuildTestTreeErrorLog(error: BuildTestTreeErrorData): string {
    const { packageName, suiteName } = error.runParams;
    const exitCode = error.exitCode === null ? 'unknown' : String(error.exitCode);
    const commandOutput = error.stderr.trim() || error.stdout.trim();
    const details = commandOutput.length > 0 ? `: ${commandOutput}` : '';
    return `Build test tree failed for ${packageName}/${suiteName} (exit code ${exitCode})${details}`;
  }

  public onRunTestsError(callback: (error: RunTestsErrorData) => void): void {
    const notification = new rpc.NotificationType<RunTestsErrorData>('runTestsError');
    this.connection.onNotification(notification, (error: RunTestsErrorData) => {
      this.showError('Test execution failed', this.buildRunTestsErrorLog(error));
      callback(error);
    });
  }

  private buildRunTestsErrorLog(error: RunTestsErrorData): string {
    const { testRun: { packageName, suiteName, testIds } } = error.runParams;
    const exitCode = error.exitCode === null ? 'unknown' : String(error.exitCode);
    const commandOutput = error.stderr.trim() || error.stdout.trim();
    const details = commandOutput.length > 0 ? `: ${commandOutput}` : '';
    const testIdLabel = testIds && testIds.length > 0 ? `[${testIds.join(',')}]` : '[all tests]';
    return `Run tests failed for ${packageName}/${suiteName} ${testIdLabel} (exit code ${exitCode})${details}`;
  }

  private showError(title: string, message: string): void {
    this.context!.outputChannel.appendLine(`> ERROR: ${title}`);
    this.context!.outputChannel.appendLine(message);
    this.context!.outputChannel.show(true);

    this.context!.statusBarItem.text = `$(error) ${title}`;
    this.context!.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
    this.context!.statusBarItem.show();
  }

  private clearError(): void {
    this.context!.statusBarItem.hide();
  }
}
