import { useCoverageBarThresholds } from '../context/coverageBarThresholds';

interface Props {
  percentage: number;
}

// Highest threshold the percentage clears wins, matching how VS Code reads
// `testing.coverageBarThresholds`. 0% is handled separately as an unfilled grey
// bar, so red is the first colour band above it and also the fallback for a
// percentage that sits below every configured threshold.
const getBarColorVariable = (percentage: number, thresholds: CoverageBarThresholds): string => {
  if (percentage >= thresholds.green) return 'var(--vscode-charts-green)';
  if (percentage >= thresholds.yellow) return 'var(--vscode-charts-yellow)';
  if (percentage >= thresholds.red) return 'var(--vscode-charts-red)';
  return 'var(--vscode-charts-red)';
};

const CoveragePercentageBar: React.FC<Props> = ({ percentage }) => {
  const thresholds = useCoverageBarThresholds();
  const isEmpty = percentage === 0;
  const color = getBarColorVariable(percentage, thresholds);

  return (
    <span
      className={`relative h-[9.6px] w-[17.6px] rounded-[2px] shrink-0 overflow-hidden border ${isEmpty ? 'border-base-12' : ''}`}
      style={isEmpty ? undefined : { borderColor: color }}
    >
      <span
        className={`absolute inset-y-0 left-0 opacity-70 ${isEmpty ? 'bg-base-12' : ''}`}
        style={{
          width: isEmpty ? '100%' : `${percentage}%`,
          backgroundColor: isEmpty ? undefined : color,
        }}
      />
    </span>
  );
};

export default CoveragePercentageBar;
