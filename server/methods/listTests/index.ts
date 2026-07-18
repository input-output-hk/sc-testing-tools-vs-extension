import * as rpc from 'vscode-jsonrpc/node';

import runScript from './runScript';
import { ScriptExecutionError } from '../../utils/runScript';

export default class TestListMethod {

  private connection: rpc.MessageConnection;

  constructor(connection: rpc.MessageConnection) {
    this.connection = connection;

    const listTestsRequest = new rpc.RequestType<ListTestsParams, Array<Test>, ScriptExecutionErrorData>('listTests');
    this.connection.onRequest(listTestsRequest, this.listTests.bind(this));
  }
  
  private async listTests(params: ListTestsParams): Promise<Array<Test>> {
    try {
      return await runScript(params);
    } catch (error) {
      if (error instanceof ScriptExecutionError) {
        throw new rpc.ResponseError<ScriptExecutionErrorData>(
          rpc.ErrorCodes.InternalError,
          error.message,
          error.data
        );
      }

      const message = error instanceof Error ? error.message : String(error);
      throw new rpc.ResponseError(rpc.ErrorCodes.InternalError, `Unable to list tests: ${message}`);
    }
  };

}