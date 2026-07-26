import * as rpc from 'vscode-jsonrpc/node';

import ListTestsMethod from './methods/listTests';
import RunTestsMethod from './methods/runTests';

const connection = rpc.createMessageConnection(
  new rpc.StreamMessageReader(process.stdin),
  new rpc.StreamMessageWriter(process.stdout)
);

new ListTestsMethod(connection);
new RunTestsMethod(connection);

connection.listen();