import * as rpc from 'vscode-jsonrpc/node';

import { prefetchTestTree } from './prefetch';

export default class PrefetchTestTreeMethod {

  private connection: rpc.MessageConnection;

  constructor(connection: rpc.MessageConnection) {
    this.connection = connection;

    const prefetchTestTreeRequest = new rpc.RequestType<PrefetchTestTreeParams, TestTree, void>('prefetchTestTree');
    this.connection.onRequest(prefetchTestTreeRequest, this.prefetchTestTree.bind(this));
  }

  private async prefetchTestTree(params: PrefetchTestTreeParams): Promise<TestTree> {
    try {
      return await prefetchTestTree(params.workspaces);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new rpc.ResponseError(rpc.ErrorCodes.InternalError, `Unable to prefetch test tree: ${message}`);
    }
  };

}
