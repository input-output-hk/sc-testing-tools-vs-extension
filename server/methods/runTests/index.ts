import * as rpc from 'vscode-jsonrpc/node';

import runWithDocker from './runWithDocker';

export default class TestRunMethod {

  private connection: rpc.MessageConnection;

  constructor(connection: rpc.MessageConnection) {
    this.connection = connection;

    const runTestsNotification = new rpc.NotificationType<RunTestsParams>('runTests');
    this.connection.onNotification(runTestsNotification, this.runTests.bind(this));
  }


  private runTests(params: RunTestsParams): void {
    if (params.mode === 'docker') {
      (async () => {
        for await (const result of runWithDocker(params)) {
          this.sendTestResult(result);
        }
      })();
    } else {
      throw new Error(`Unsupported mode: ${params.mode}`);
    }
  };

  public sendTestResult(result: TestRunResult): void {
    this.connection.sendNotification('testResult', result);
  };

}