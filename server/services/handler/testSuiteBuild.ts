import { runBuildScript } from '../../utils/runScript';
import { parseTestSuiteBuildEvent } from '../../utils/parseTestEvent';
import { handleParseError, buildErrorEvent, sendTestRunUpdate, sendTestEvent } from './utils';

import type RpcServer from '../../index';

export const handleTestSuiteBuild = async (server: RpcServer, job: TestBuildJob): Promise<void> => {
  const startedOn = Date.now();
  sendTestRunUpdate(server, job, 'running', startedOn);

  try {
    for await (const output of runBuildScript(
      job.params.mode,
      job.params.workspace.path,
      job.params.packageName,
      job.params.suiteName
    )) {
      try {
        const testEvent = parseTestSuiteBuildEvent(
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

      if (server.getStopSignal()) {
        output.child.kill();
        return;
      }
    }
  } catch (error) {
    sendTestEvent(server, buildErrorEvent(job, error));
    sendTestRunUpdate(server, job, 'failed', startedOn, Date.now());
    return;
  }

  sendTestRunUpdate(server, job, 'success', startedOn, Date.now());
};
