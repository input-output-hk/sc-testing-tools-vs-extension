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

  public async prefetch(params: PrefetchParams): Promise<TestTree> {
    const request = new rpc.RequestType<PrefetchParams, TestTree, void>('prefetch');
    return await this.connection.sendRequest(request, params);
  }

  public testSuiteBuild(params: TestSuiteBuildParams): void {
    const notification = new rpc.NotificationType<TestSuiteBuildParams>('testSuiteBuild');
    this.connection.sendNotification(notification, params);
    this.clearError();
  }

  public testRun(params: TestRunParams): void {
    const notification = new rpc.NotificationType<TestRunParams>('testRun');
    this.connection.sendNotification(notification, params);
    this.clearError();
  }

  public onTestEvent(callback: (event: TestEvent) => void): void {
    this.connection.onNotification('testEvent', (event: TestEvent) => {
      if (event.eventType === 'test-build-error') {
        this.showError('Test suite build failed', this.buildTestBuildErrorLog(event as TestSuiteBuildErrorEvent));
      }
      if (event.eventType === 'test-run-error') {
        this.showError('Test execution failed', this.buildTestRunErrorLog(event as TestRunErrorEvent));
      }
      callback(event);
    });
  }

  private buildTestBuildErrorLog(event: TestSuiteBuildErrorEvent): string {
    const { packageName, suiteName } = event.payload.runParams;
    const exitCode = event.payload.exitCode === null ? 'unknown' : String(event.payload.exitCode);
    const commandOutput = event.payload.stderr.trim() || event.payload.stdout.trim();
    const details = commandOutput.length > 0 ? `: ${commandOutput}` : '';
    return `Build test suite failed for ${packageName}/${suiteName} (exit code ${exitCode})${details}`;
  }

  private buildTestRunErrorLog(event: TestRunErrorEvent): string {
    const { testRun: { packageName, suiteName, testIds } } = event.payload.runParams;
    const exitCode = event.payload.exitCode === null ? 'unknown' : String(event.payload.exitCode);
    const commandOutput = event.payload.stderr.trim() || event.payload.stdout.trim();
    const details = commandOutput.length > 0 ? `: ${commandOutput}` : '';
    const testIdLabel = testIds && testIds.length > 0 ? `[${testIds.join(',')}]` : '[all tests]';
    return `Run test failed for ${packageName}/${suiteName} ${testIdLabel} (exit code ${exitCode})${details}`;
  }

  private showError(title: string, message: string): void {
    this.context!.outputChannel.appendLine(`> ERROR: ${title}`);
    this.context!.outputChannel.appendLine(message);
    this.context!.outputChannel.show(true);

    this.context!.statusBarItem.text = `$(error) ${title}`;
    this.context!.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
    this.context!.statusBarItem.show();

    vscode.window.showErrorMessage(title);
  }

  private clearError(): void {
    this.context!.statusBarItem.hide();
  }
}
