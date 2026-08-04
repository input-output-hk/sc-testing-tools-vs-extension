interface Props {
  percentage: number;
}

const getSwatchColorClass = (percentage: number): string => {
  if (percentage === 0) return 'bg-base-12';
  if (percentage > 80) return 'bg-green-01';
  if (percentage >= 50) return 'bg-yellow-02';
  return 'bg-red-01';
};

const CoverageSwatch: React.FC<Props> = ({ percentage }) => (
  <span className="relative h-[15px] w-[28px] rounded-sm shrink-0 overflow-hidden border border-base-10">
    <span
      className={`absolute inset-y-0 left-0 ${getSwatchColorClass(percentage)}`}
      style={{ width: percentage === 0 ? '100%' : `${percentage}%` }}
    />
  </span>
);

export default CoverageSwatch;
