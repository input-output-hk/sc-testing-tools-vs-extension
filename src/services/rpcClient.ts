import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as rpc from 'vscode-jsonrpc/node';

import { PbtContext } from '../extension';
  
export default class RpcClient {
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

  public onTestResult(callback: (test: TestRunResult) => void): void {
    this.connection.onNotification('testResult', (test: TestRunResult) => {
      callback(test);
    });
  }

  public async listSuites(): Promise<TestPackageList> {
    const request = new rpc.RequestType<ListSuitesParams, TestPackageList, void>('listSuites');
    const workspacePaths = vscode.workspace.workspaceFolders?.map(folder => folder.uri.fsPath) || [];
    return await this.connection.sendRequest(request, { workspacePaths });
  }

  public async listTests(params: ListTestsParams): Promise<Array<Test>> {
    const request = new rpc.RequestType<ListTestsParams, Array<Test>, void>('listTests');
    return await this.connection.sendRequest(request, params);
  }

  public runTests(params: RunTestsParams): void {
    const notification = new rpc.NotificationType<RunTestsParams>('runTests');
    this.connection.sendNotification(notification, params);
  }
}
