import TestStatusIcon from './TestStatusIcon';

interface Props {
  test: Test;
}

const formatTestTime = (time: number): string => {
  if (time < 1000) {
    return `${time.toFixed(2)}ms`;
  } else {
    return `${(time / 1000).toFixed(2)}s`;
  }
};

const TestHeader: React.FC<Props> = ({ test }) => (
  <div>
    <div className="flex justify-between items-center mb-1.5">
      <TestStatusIcon status={test.status} />
      <span className="flex-1 ml-1.5 text-base-06 font-semibold text-lg">{test.name}</span>
      {test.time !== undefined && test.time > 0 &&
        <span className="flex-none text-base-06 font-medium">
          {formatTestTime(test.time)}
        </span>
      }
    </div>
    <div className="flex min-w-0 flex-1 items-center">
      <span className="block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
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
        <span className="text-base-08 font-medium">{test.group[test.group.length - 1]}</span>
      </span>
    </div>
  </div>
);

export default TestHeader;