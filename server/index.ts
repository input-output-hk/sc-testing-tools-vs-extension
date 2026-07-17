import * as rpc from 'vscode-jsonrpc/node';

import ListSuitesMethod from './methods/listSuites';
import ListTestsMethod from './methods/listTests';
import RunTestsMethod from './methods/runTests';

const connection = rpc.createMessageConnection(
  new rpc.StreamMessageReader(process.stdin),
  new rpc.StreamMessageWriter(process.stdout)
);

new ListSuitesMethod(connection);
new ListTestsMethod(connection);
new RunTestsMethod(connection);

connection.listen();