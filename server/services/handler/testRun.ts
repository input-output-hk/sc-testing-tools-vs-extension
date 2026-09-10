import { runRunScript } from '../../utils/runScript';
import { parseTestEvent } from '../../utils/parseTestEvent';
import { getTestRuns, handleParseError, buildErrorEvent, sendTestRunUpdate, sendTestEvent } from './utils';

import type RpcServer from '../../index';

export const handleTestRun = async (server: RpcServer, job: TestRunJob): Promise<void> => {
  const startedOn = Date.now();
  sendTestRunUpdate(server, job, 'running', startedOn);

  let hasFailed = false;
  for (const testRun of getTestRuns(job.params.workspace, job.params.testIds)) {
    try {
      for await (const output of runRunScript(
        job.params.mode,
        job.params.workspace.path,
        testRun.packageName,
        testRun.suiteName,
        testRun.testIds
      )) {
        try {
          const testEvent = parseTestEvent(
            job.params.workspace.id,
            testRun.packageName,
            testRun.suiteName,
            testRun.testIds !== undefined && testRun.testIds.length > 0,
            output
          );
          if (testEvent !== null) {
            sendTestEvent(server, testEvent);
          }
        } catch (error) {
          handleParseError(error);
        }

        if (server.getStopSignal()) {
          output.child.kill();
          return;
        }
      }
    } catch (error) {
      sendTestEvent(server, buildErrorEvent(job, error, testRun));
      hasFailed = true;
    }
  }

  sendTestRunUpdate(server, job, hasFailed ? 'failed' : 'success', startedOn, Date.now());
};
