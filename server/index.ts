import * as rpc from 'vscode-jsonrpc/node';

import PrefetchMethod from './methods/prefetch';
import TestSuiteBuildMethod from './methods/testSuiteBuild';
import TestRunMethod from './methods/testRun';

const connection = rpc.createMessageConnection(
  new rpc.StreamMessageReader(process.stdin),
  new rpc.StreamMessageWriter(process.stdout)
);

new PrefetchMethod(connection);
new TestSuiteBuildMethod(connection);
new TestRunMethod(connection);

connection.listen();