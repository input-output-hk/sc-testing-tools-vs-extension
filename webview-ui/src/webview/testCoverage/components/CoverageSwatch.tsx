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
  <span className={`h-[15px] w-[28px] rounded-sm shrink-0 ${getSwatchColorClass(percentage)}`} />
);

export default CoverageSwatch;
