import * as rpc from 'vscode-jsonrpc/node';

import runScript from './runScript';

export default class TestListMethod {

  private connection: rpc.MessageConnection;

  constructor(connection: rpc.MessageConnection) {
    this.connection = connection;

    const listTestsRequest = new rpc.RequestType<ListTestsParams, Array<Test>, void>('listTests');
    this.connection.onRequest(listTestsRequest, this.listTests.bind(this));
  }
  
  private async listTests(params: ListTestsParams): Promise<Array<Test>> {
    return await runScript(params);
  };

}