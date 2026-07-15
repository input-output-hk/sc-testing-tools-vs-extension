import * as rpc from 'vscode-jsonrpc/node';

import runScript from './runScript';

export default class TestRunMethod {

  private connection: rpc.MessageConnection;

  constructor(connection: rpc.MessageConnection) {
    this.connection = connection;

    const runTestsNotification = new rpc.NotificationType<RunTestsParams>('runTests');
    this.connection.onNotification(runTestsNotification, this.runTests.bind(this));
  }


  private runTests(params: RunTestsParams): void {
    (async () => {
      for await (const result of runScript(params)) {
        this.sendTestResult(result);
      }
    })();
  };

  public sendTestResult(result: TestResult): void {
    this.connection.sendNotification('testResult', result);
  };

}