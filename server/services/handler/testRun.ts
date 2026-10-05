import { runRunScript } from '../../utils/runScript';
import { parseTestEvent } from '../../utils/parseTestEvent';
import { validateTestEvent } from '../../utils/validateTestEvent';
import { getTestRuns, handleParseError, buildErrorEvent, sendTestRunUpdate, sendTestEvent } from './utils';

import type RpcServer from '../../index';

export const handleTestRun = async (server: RpcServer, job: TestRunJob, signal: AbortSignal): Promise<void> => {
  const startedOn = Date.now();
  sendTestRunUpdate(server, job, 'running', startedOn);

  let hasFailed = false;
  let isSuiteDone = false;
  for (const testRun of getTestRuns(job.params.workspace, job.params.testIds)) {
    if (signal.aborted) return;
    try {
      for await (const output of runRunScript(
        job.params.mode,
        job.params.workspace.path,
        testRun.packageName,
        testRun.suiteName,
        job.params.rounds,
        testRun.testIds,
        signal
      )) {
        try {
          const testEvent = parseTestEvent(
            job.id,
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

        if (validateTestEvent(output.parsed)) {
          if (output.parsed.event === 'suite_done') {
            isSuiteDone = true;
          }
        }

        if (signal.aborted) return;
      }
    } catch (error) {
      if (signal.aborted) return;
      if (!isSuiteDone) {
        sendTestEvent(server, buildErrorEvent(job, error, testRun));
        hasFailed = true;
      }
    }
  }

  if (signal.aborted) return;
  sendTestRunUpdate(server, job, hasFailed ? 'failed' : 'success', startedOn, Date.now());
};
