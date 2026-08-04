import RunningIndicator from '../../../components/RunningIndicator';

interface Props {
  testResult: TestResult;
}

const columns = [
  { label: 'Rounds', align: 'center' },
  { label: 'Transactions', align: 'center' },
  { label: 'Inputs', align: 'center' },
  { label: 'Outputs', align: 'center' },
  { label: 'Mints', align: 'center' },
];

const TestRoundsTab: React.FC<Props> = ({ testResult }) => {
  return (
    <div className="flex flex-col overflow-hidden flex-1 mt-4">
      {testResult.test.status === 'running' ? (
        <RunningIndicator />
      ) : (
        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse table-fixed">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.label}
                    className={`h-8 px-4 border border-base-13 bg-base-20 text-xs font-bold text-base-05 ${col.align === 'left' ? 'text-left' : 'text-center'}`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {testResult.rounds.map((round, index) => (
                <tr
                  key={index}
                  className={index % 2 === 0 ? 'bg-base-19' : 'bg-base-20'}
                >
                  <td className="h-9 px-4 border border-base-13 text-xs text-base-06 truncate text-center">
                    {round.id}
                  </td>
                  <td className="h-9 px-4 border border-base-13 text-xs text-base-06 truncate text-center">
                    {round.transitions.length}
                  </td>
                  <td className="h-9 px-4 border border-base-13 text-xs text-base-06 truncate text-center">
                    0
                  </td>
                  <td className="h-9 px-4 border border-base-13 text-xs text-base-06 truncate text-center">
                    0
                  </td>
                  <td className="h-9 px-4 border border-base-13 text-xs text-base-06 truncate text-center">
                    0
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TestRoundsTab;
