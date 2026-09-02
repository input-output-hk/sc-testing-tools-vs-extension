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
      if (event.eventType === 'test-run-error') {
        const errorEvent = event as TestRunErrorEvent;
        this.showError(errorEvent);
      }
      callback(event);
    });
  }

  private showError(event: TestRunErrorEvent): void {
    const { title, message } = this.buildTestError(event);

    this.context!.outputChannel.appendLine(`> ERROR: ${title}`);
    this.context!.outputChannel.appendLine(message);

    this.context!.statusBarItem.text = `$(error) ${title}`;
    this.context!.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
    this.context!.statusBarItem.show();

    vscode.window
      .showErrorMessage(title, 'Show output')
      .then(selection => {
        if (selection === 'Show output') {
          this.context!.outputChannel.show(true);
        }
      });
  }

  private clearError(): void {
    this.context!.statusBarItem.hide();
  }

  private buildTestError(event: TestRunErrorEvent): { title: string; message: string } {
    const exitCode = event.payload.error.exitCode === null ? 'unknown' : String(event.payload.error.exitCode);
    const commandOutput = event.payload.error.stderr.trim() || event.payload.error.stdout.trim();
    const details = commandOutput.length > 0 ? commandOutput : '';
    const message = `Exit code: ${exitCode}, ${details}`;

    let title = '';
    if (event.payload.job.type === 'build') {
      const { packageName, suiteName } = (event.payload.job as RpcBuildJob).params;
      title = `Test suite build failed for ${packageName}/${suiteName}`;
    }
    if (event.payload.job.type === 'run') {
      const { packageName, suiteName } = event.payload.failedTestRun!;
      title = `Test execution failed for ${packageName}/${suiteName}`;
    }

    return { title, message };
  }
}
