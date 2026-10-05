import { handleTestSuiteBuild } from './testSuiteBuild';
import { handleTestRun } from './testRun';

import type RpcServer from '../../index';

export const handleJob = async (server: RpcServer, job: TestJob, signal: AbortSignal): Promise<void> => {
  switch (job.type) {
    case 'build':
      await handleTestSuiteBuild(server, job as TestBuildJob, signal);
      break;
    case 'run':
      await handleTestRun(server, job as TestRunJob, signal);
      break;
  }
};