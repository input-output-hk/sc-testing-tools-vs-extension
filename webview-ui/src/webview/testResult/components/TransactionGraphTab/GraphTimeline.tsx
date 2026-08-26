import { VscodeButton } from '@vscode-elements/react-elements';

interface Props {
  trace: number | null;
  round: ThreatModelTestRound;
  onSelectTrace: (trace: number) => void;
}

interface SliderProps {
  current: number;
  total: number;
  onSelect: (value: number) => void;
}

const TimelineSlider: React.FC<SliderProps> = ({ current, total, onSelect }) => (
  <div className="flex-1 relative">
    <div className="absolute top-1 left-0 w-full h-1 rounded bg-base-13 opacity-50 -z-2" />
    <div
      style={{ width: `${total > 1 ? (current / (total - 1) * 100) : 100}%` }}
      className="absolute top-1 left-0 h-1 rounded bg-base-06 opacity-50 -z-1"
    />
    <div className={`flex flex-row items-center ${total > 1 ? 'justify-between' : 'justify-center'}`}>
      {[...Array(total)].map((_, index) =>
        <span
          key={index}
          className={`h-3 w-3 rounded-full cursor-pointer ${index <= current ? 'bg-base-06' : 'bg-base-12 opacity-75'}`}
          onClick={() => onSelect(index)}
        />
      )}
    </div>
  </div>
);

const GraphTimeline: React.FC<Props> = ({ trace, round, onSelectTrace }) => {
  if (trace === null) return null;

  const isFirstTrace = trace <= 0;
  const isLastTrace = trace >= round.traces.length - 1;

  const handlePrevTrace = () => {
    if (!isFirstTrace) onSelectTrace(trace - 1);
  };

  const handleNextTrace = () => {
    if (!isLastTrace) onSelectTrace(trace + 1);
  };

  return (
    <div className="absolute left-0 top-0 w-full z-1">
      <div className="p-2 flex flex-row justify-between items-center gap-4 backdrop-blur-xs bg-[#252526CC]">
        <VscodeButton secondary
          disabled={isFirstTrace}
          onClick={handlePrevTrace}
          style={{ '--vscode-button-border': 'transparent' } as React.CSSProperties}
          className="flex flex-row items-center gap-1"
        >
          <i className="codicon codicon-chevron-left" />
          <span>Prev</span>
        </VscodeButton>

        <TimelineSlider
          current={trace}
          total={round.traces.length}
          onSelect={onSelectTrace}
        />

        <VscodeButton secondary
          disabled={isLastTrace}
          onClick={handleNextTrace}
          style={{ '--vscode-button-border': 'transparent' } as React.CSSProperties}
          className="flex flex-row items-center gap-1"
        >
          <span>Next</span>
          <i className="codicon codicon-chevron-right" />
        </VscodeButton>
      </div>
    </div>
  );
};

export default GraphTimeline;
