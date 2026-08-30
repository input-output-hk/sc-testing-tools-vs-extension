import { VscodeButton } from '@vscode-elements/react-elements';

interface Props {
  stepIndex: number;
  round: ThreatModelTestRound;
  onSelectStep: (stepIndex: number) => void;
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

const GraphTimeline: React.FC<Props> = ({ stepIndex, round, onSelectStep }) => {
  const isFirstStep = stepIndex <= 0;
  const isLastStep = stepIndex >= round.traces.length - 1;

  const handlePrevStep = () => {
    if (!isFirstStep) onSelectStep(stepIndex - 1);
  };

  const handleNextStep = () => {
    if (!isLastStep) onSelectStep(stepIndex + 1);
  };

  return (
    <div className="absolute left-0 top-0 w-full z-1">
      <div className="p-2 flex flex-row justify-between items-center gap-4 backdrop-blur-xs bg-[#252526CC]">
        <VscodeButton secondary
          disabled={isFirstStep}
          onClick={handlePrevStep}
          style={{ '--vscode-button-border': 'transparent' } as React.CSSProperties}
          className="flex flex-row items-center gap-1"
        >
          <i className="codicon codicon-chevron-left" />
          <span>Prev</span>
        </VscodeButton>

        <TimelineSlider
          current={stepIndex}
          total={round.traces.length}
          onSelect={onSelectStep}
        />

        <VscodeButton secondary
          disabled={isLastStep}
          onClick={handleNextStep}
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
