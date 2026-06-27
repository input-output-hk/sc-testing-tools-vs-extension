import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as rpc from 'vscode-jsonrpc/node';

import { PbtContext } from '../extension';

type TestListParams = {

}

type RunTestParams = {
	testIds: number[];
}

export type TestResult = {
  id: number;
  status: TestStatus;
  time: number;
}
  
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

    this.connection.listen();

    this.connection.trace(rpc.Trace.Verbose, {
      log: (message: string, data?: string) => {
        context.outputChannel.append(`> ${message}\n${data}`);
      }
    });
  }

  public onTestResult(callback: (test: TestResult) => void): void {
    this.connection.onNotification('testResult', (test: TestResult) => {
      callback(test);
    });
  }

  public async buildTestList(): Promise<Array<Test>> {
    const request = new rpc.RequestType<TestListParams, Array<Test>, void>('buildTestList');
    return await this.connection.sendRequest(request, {});
  }

  public runTest(testIds: number[]): void {
    const notification = new rpc.NotificationType<RunTestParams>('runTest');
    this.connection.sendNotification(notification, { testIds });
  }
}
