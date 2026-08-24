import * as rpc from 'vscode-jsonrpc/node';

import { prefetch } from './prefetch';

export default class PrefetchMethod {

  private connection: rpc.MessageConnection;

  constructor(connection: rpc.MessageConnection) {
    this.connection = connection;

    const prefetchRequest = new rpc.RequestType<PrefetchParams, TestTree, void>('prefetch');
    this.connection.onRequest(prefetchRequest, this.prefetch.bind(this));
  }

  private async prefetch(params: PrefetchParams): Promise<TestTree> {
    try {
      return await prefetch(params.workspaces);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new rpc.ResponseError(rpc.ErrorCodes.InternalError, `Unable to prefetch test tree: ${message}`);
    }
  };

}
