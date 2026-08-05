import * as rpc from 'vscode-jsonrpc/node';

import PrefetchTestTree from './methods/prefetchTestTree';
import BuildTestTree from './methods/buildTestTree';
import RunTestsMethod from './methods/runTests';

const connection = rpc.createMessageConnection(
  new rpc.StreamMessageReader(process.stdin),
  new rpc.StreamMessageWriter(process.stdout)
);

new PrefetchTestTree(connection);
new BuildTestTree(connection);
new RunTestsMethod(connection);

connection.listen();