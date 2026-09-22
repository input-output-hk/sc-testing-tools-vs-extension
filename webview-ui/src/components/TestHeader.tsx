import TestStatusIcon from './TestStatusIcon';
import Tooltip from './Tooltip';

import { formatRunTime } from '../utils/format';

interface Props {
  test: Test;
}

const TestHeader: React.FC<Props> = ({ test }) => (
  <div>
    <div className="flex justify-between items-center mb-1.5">
      <TestStatusIcon
        status={{
          status: test.status,
          isWaiting: test.isWaiting,
          isRunning: test.isRunning
        }}
      />
      <span className="flex-1 ml-1.5 text-base-06 font-semibold text-[15.6px]">{test.name}</span>
      {test.time !== undefined && test.time > 0 &&
        <span className="flex-none text-base-06 font-medium">
          {formatRunTime(test.time)}
        </span>
      }
    </div>
    <div className="flex min-w-0 flex-1 items-center">
      <span className="flex min-w-0 flex-1">
        <span id="test-header-path" className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
          <span className="text-base-10 font-medium">
            <span>{test.id[1]}</span>
            <i className="codicon codicon-chevron-right mx-0.5 translate-y-0.5" style={{ fontSize: '12px' }} />
            <span>{test.id[2]}</span>
            <i className="codicon codicon-chevron-right mx-0.5 translate-y-0.5" style={{ fontSize: '12px' }} />
          </span>
          {test.group.slice(0, -1).map(group =>
            <span key={group} className="text-base-10 font-medium">
              <span>{group}</span>
              <i className="codicon codicon-chevron-right mx-0.5 translate-y-0.5" style={{ fontSize: '12px' }} />
            </span>
          )}
        </span>
        <span className="flex-none text-base-08 font-medium">{test.group[test.group.length - 1]}</span>
      </span>
      <Tooltip
        content={[test.id[1], test.id[2], ...test.group.slice(0, -1)].join(' / ')}
        id="test-header-path"
        maxWidth="300px"
        place="bottom-end"
      />
    </div>
  </div>
);

export default TestHeader;