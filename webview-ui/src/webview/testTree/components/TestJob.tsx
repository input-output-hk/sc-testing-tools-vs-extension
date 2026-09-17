import { useEffect, useState } from 'react';

import StatusIcon from '../../../components/StatusIcon';
import { formatRunTime } from '../../../utils/format';

interface Props {
  testJob: TestJob | null;
}

const mapStatusToClassName = (status: TestJobStatus): string => {
  switch (status) {
    case 'waiting':
      return 'codicon-history text-yellow-02';
    case 'running':
      return 'codicon-loading';
    case 'success':
      return 'codicon-pass text-green-01';
    case 'failed':
      return 'codicon-error text-red-01';
  }
};

const TestJob: React.FC<Props> = ({ testJob }) => {
  const [currentTime, setCurrentTime] = useState(0);
  const startedOn = testJob?.startedOn;
  const finishedOn = testJob?.finishedOn;

  useEffect(() => {
    if (startedOn === undefined || finishedOn !== undefined) return;
    const interval = window.setInterval(() => setCurrentTime(Date.now()), 100);
    return () => window.clearInterval(interval);
  }, [startedOn, finishedOn]);

  let message: string = 'No tests results yet.';
  let time: string | null = null;
  
  if (testJob !== null) {
    if (testJob.type === 'build') {
      if (testJob.status === 'running' || testJob.status === 'waiting') {
        const { packageName, suiteName } = (testJob as TestBuildJob).params;
        message = `Building ${packageName}/${suiteName}`;
      } else {
        message = `Test suites build complete.`;
      }
    }
    if (testJob.type === 'run') {
      if (testJob.status === 'running' || testJob.status === 'waiting') {
        message = `Running tests...`;
      } else {
        message = `Test run complete.`;
      }
      if (testJob.startedOn) {
        if (!testJob.finishedOn) {
          time = formatRunTime(Math.max(currentTime - testJob.startedOn, 0));
        } else {
          time = formatRunTime(testJob.finishedOn - testJob.startedOn);
        }
      }
    }
  }

  return (
    <div className="flex flex-row items-center gap-1 px-2 py-1">
      {testJob !== null &&
        <StatusIcon
          className={mapStatusToClassName(testJob.status)}
          animated={testJob.status === 'running'}
        />
      }
      <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-base-10 text-xs font-medium">
        {message}
      </span>
      {time !== null &&
        <span className="text-base-10 text-xs font-medium">
          {time}
        </span>
      }
    </div>
  );
};

export default TestJob;