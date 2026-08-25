import {
  VscodeSingleSelect,
  VscodeOption,
  VscodeButton,
  VscodeButtonGroup
} from '@vscode-elements/react-elements';

interface Props {
  mode: GraphMode;
  testRounds: Array<TestRound>;
  selectedRound: TestRound;
  onRoundChange: (round: TestRound) => void;
  onSelectMode: (mode: GraphMode) => void;
}

interface TxButtonProps {
  mode: GraphMode;
  round: TestRound;
  onSelectMode: (mode: GraphMode) => void;
}

const TxButton: React.FC<TxButtonProps> = ({ round, mode, onSelectMode }) => (
  round.type === 'threat-model' &&
    <VscodeButtonGroup>
      <VscodeButton secondary
        onClick={() => onSelectMode('result-graph')}
        className={mode === 'result-graph' ? 'bg-base-14' : ''}
        style={{ '--vscode-button-border': 'transparent' } as React.CSSProperties}
      >
        Result Graph
      </VscodeButton>
      <VscodeButton secondary
        onClick={() => onSelectMode('attack-timeline')}
        className={mode === 'attack-timeline' ? 'bg-base-14' : ''}
        style={{ '--vscode-button-border': 'transparent' } as React.CSSProperties}
      >
        Attack Timeline
      </VscodeButton>
    </VscodeButtonGroup>
);

const Toolbar: React.FC<Props> = ({ selectedRound, testRounds, onRoundChange, mode, onSelectMode }) => (
  <div className="flex-none p-2 flex flex-row justify-between items-center gap-2 bg-base-18">
    <div className="flex-none flex flex-row items-center gap-2">
      <button className="ml-1 pt-1 px-1 rounded-full hover:bg-base-17 active:bg-base-16 cursor-pointer">
        <i className="codicon codicon-map text-[#FFFFFFCC] active:text-white" />
      </button>
    </div>

    <div className="flex-none flex flex-row items-center gap-2">
      <TxButton
        mode={mode}
        round={selectedRound}
        onSelectMode={onSelectMode}
      />
      <VscodeSingleSelect
        value={selectedRound.id.toString()}
        onChange={event => {
          const value = (event.target as EventTarget & { value?: string }).value;
          if (value) {
            const selectedId = parseInt(value, 10);
            const round = testRounds.find((r) => r.id === selectedId);
            if (round) onRoundChange(round);
          }
        }}
      >
        {testRounds.map((round, index) =>
          <VscodeOption
            key={index}
            value={round.id.toString()}
          >
            Round {round.id}
          </VscodeOption>
        )}
      </VscodeSingleSelect>
    </div>
  </div>
);

export default Toolbar;
