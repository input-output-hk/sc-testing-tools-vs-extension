interface Props {
  percentage: number;
}

const getBarBackgroundClass = (percentage: number): string => {
  if (percentage === 0) return 'bg-base-12';
  if (percentage > 80) return 'bg-green-01';
  if (percentage >= 50) return 'bg-yellow-02';
  return 'bg-red-01';
};

const getBarBorderClass = (percentage: number): string => {
  if (percentage === 0) return 'border-base-12';
  if (percentage > 80) return 'border-green-01';
  if (percentage >= 50) return 'border-yellow-02';
  return 'border-red-01';
};

const CoveragePercentageBar: React.FC<Props> = ({ percentage }) => (
  <span className={`relative h-[15px] w-[28px] rounded-sm shrink-0 overflow-hidden border ${getBarBorderClass(percentage)}`}>
    <span
      className={`absolute inset-y-0 left-0 opacity-70 ${getBarBackgroundClass(percentage)}`}
      style={{ width: percentage === 0 ? '100%' : `${percentage}%` }}
    />
  </span>
);

export default CoveragePercentageBar;
