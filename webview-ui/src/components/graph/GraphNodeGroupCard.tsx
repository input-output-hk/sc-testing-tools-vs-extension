import type { GraphNodeCardProps } from './GraphNodeCard';

export interface GraphNodeGroupCardProps extends Record<string, unknown> {
  type: GraphNodeCardProps['type'];
  count: number;
  totalAmount?: string;
  onExpand: () => void;
}

const HEADER_BG: Record<GraphNodeCardProps['type'], string> = {
  utxo: 'bg-blue-09',
  tx: 'bg-green-05',
};

const GHOST_LEVELS = [
  { widthPct: 55, height: 12, opacity: 0.25 },
  { widthPct: 65, height: 14, opacity: 0.35 },
  { widthPct: 75, height: 16, opacity: 0.5 },
  { widthPct: 85, height: 18, opacity: 0.65 },
  { widthPct: 92, height: 20, opacity: 0.75 },
];

interface HeaderProps {
  type: GraphNodeCardProps['type'];
  widthPct: number;
  height: number;
  opacity: number;
  isLast: boolean;
}

const Header: React.FC<HeaderProps> = ({ type, widthPct, height, opacity, isLast }) => (
  <div
    style={{ width: `${widthPct}%`, height, opacity }}
    className={`flex items-center px-1 rounded-t ${HEADER_BG[type]}${!isLast ? " -mb-1.5" : ""}`}
  >
    <span className="text-base-01 text-[10px]">{type}</span>
  </div>
);

const GraphNodeGroupCard: React.FC<GraphNodeGroupCardProps> = ({
  type,
  count,
  totalAmount,
  onExpand,
}) => {
  const numGhosts = Math.min(count - 1, 5);
  const ghosts = numGhosts > 0 ? GHOST_LEVELS.slice(-numGhosts) : [];

  return (
    <div className="flex flex-col items-center w-55">
      {ghosts.length > 0 && (
        <div className="flex flex-col items-center w-full -mb-1.5">
          {ghosts.map((g, i) => (
            <Header key={i} type={type} {...g} isLast={i === ghosts.length - 1} />
          ))}
        </div>
      )}

      <div className="flex flex-col w-full rounded-[5px] overflow-clip">
        <div
          className={`flex flex-row items-center ${HEADER_BG[type]} h-5.5 px-1 gap-1`}
        >
          <span className="text-base-01 text-[12px]">{type}</span>
          <div className="ml-auto flex items-center">
            <button
              onClick={onExpand}
              className="cursor-pointer flex items-center p-1"
            >
              <i className="codicon codicon-expand-all text-base-01 text-[14px]" />
            </button>
          </div>
        </div>

        <div className="flex flex-col bg-base-18 pt-2 pb-2 px-3 text-base-06 text-[11px] gap-1">
          <span className="opacity-70">{count} UTxOs</span>
          {totalAmount && <span className="opacity-70">{totalAmount}</span>}
        </div>
      </div>
    </div>
  );
};

export default GraphNodeGroupCard;
