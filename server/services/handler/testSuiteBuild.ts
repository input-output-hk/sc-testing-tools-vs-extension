import { runBuildScript } from '../../utils/runScript';
import { parseTestSuiteBuildEvent } from '../../utils/parseTestEvent';
import { handleParseError, buildErrorEvent, sendTestRunUpdate, sendTestEvent } from './utils';

import type RpcServer from '../../index';

export const handleTestSuiteBuild = async (server: RpcServer, job: TestBuildJob, signal: AbortSignal): Promise<void> => {
  const startedOn = Date.now();
  sendTestRunUpdate(server, job, 'running', startedOn);

  try {
    for await (const output of runBuildScript(
      job.params.mode,
      job.params.workspace.path,
      job.params.packageName,
      job.params.suiteName,
      signal
    )) {
      try {
        const testEvent = parseTestSuiteBuildEvent(
          job.id,
          job.params.workspace.id,
          job.params.packageName,
          job.params.suiteName,
          output
        );
        if (testEvent !== null) {
          sendTestEvent(server, testEvent);
        }
      } catch (error) {
        handleParseError(error);
      }

      if (signal.aborted) return;
    }
  } catch (error) {
    if (signal.aborted) return;
    sendTestEvent(server, buildErrorEvent(job, error));
    sendTestRunUpdate(server, job, 'failed', startedOn, Date.now());
    return;
  }

  if (signal.aborted) return;
  sendTestRunUpdate(server, job, 'success', startedOn, Date.now());
};
