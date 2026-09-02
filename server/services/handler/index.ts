import * as rpc from 'vscode-jsonrpc/node';

import { handleTestSuiteBuild } from './testSuiteBuild';
import { handleTestRun } from './testRun';

export const handleJob = async (connection: rpc.MessageConnection, job: RpcJob): Promise<void> => {
  switch (job.type) {
    case 'build':
      await handleTestSuiteBuild(connection, job as RpcBuildJob);
      break;
    case 'run':
      await handleTestRun(connection, job as RpcRunJob);
      break;
  }
};