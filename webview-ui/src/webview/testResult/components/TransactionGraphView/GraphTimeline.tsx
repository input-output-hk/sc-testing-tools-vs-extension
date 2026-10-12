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
    <div className="absolute top-1 left-0 w-full h-1 rounded bg-[var(--vscode-sideBar-border)]" />
    <div
      style={{ width: `${total > 1 ? (current / (total - 1) * 100) : 100}%` }}
      className="absolute top-1 left-0 h-1 rounded bg-[var(--vscode-sideBarTitle-foreground)] opacity-50"
    />
    <div className={`relative flex flex-row items-center ${total > 1 ? 'justify-between' : 'justify-center'}`}>
      {[...Array(total)].map((_, index) =>
        <span
          key={index}
          className={`h-3 w-3 rounded-full cursor-pointer ${index <= current ? 'bg-[var(--vscode-sideBarTitle-foreground)]' : 'bg-[var(--vscode-sideBar-border)]'}`}
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
      <div className="p-2 flex flex-row justify-between items-center gap-4 bg-[var(--vscode-sideBar-background)]">
        <button type="button"
          disabled={isFirstStep}
          onClick={handlePrevStep}
          className="flex flex-row items-center gap-1 px-2 py-1 cursor-pointer disabled:opacity-50 disabled:cursor-default rounded-[var(--vscode-cornerRadius-small,2px)] hover:enabled:bg-[var(--vscode-toolbar-hoverBackground)] hover:enabled:text-[var(--vscode-surface-foreground)]"
        >
          <i className="codicon codicon-chevron-left" />
          <span>Prev</span>
        </button>

        <TimelineSlider
          current={stepIndex}
          total={round.traces.length}
          onSelect={onSelectStep}
        />

        <button type="button"
          disabled={isLastStep}
          onClick={handleNextStep}
          className="flex flex-row items-center gap-1 px-2 py-1 cursor-pointer disabled:opacity-50 disabled:cursor-default rounded-[var(--vscode-cornerRadius-small,2px)] hover:enabled:bg-[var(--vscode-toolbar-hoverBackground)] hover:enabled:text-[var(--vscode-surface-foreground)]"
        >
          <span>Next</span>
          <i className="codicon codicon-chevron-right" />
        </button>
      </div>
    </div>
  );
};

export default GraphTimeline;
