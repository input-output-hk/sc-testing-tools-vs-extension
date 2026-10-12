import {
  VscodeSingleSelect,
  VscodeOption
} from '@vscode-elements/react-elements';

interface Props {
  mode: GraphMode;
  testRoundIndex: number;
  testRounds: Array<TestRound>;
  onSelectRound: (index: number) => void;
  onSelectMode: (mode: GraphMode) => void;
  onOpenExplorer: () => void;
}

interface TxButtonProps {
  mode: GraphMode;
  round: TestRound;
  onSelectMode: (mode: GraphMode) => void;
}

const TxButton: React.FC<TxButtonProps> = ({ round, mode, onSelectMode }) => (
  round.type === 'threat-model' &&
    <div className="flex items-center gap-1 text-[var(--vscode-modernTab-activeForeground)]">
      <button type="button"
        onClick={() => onSelectMode('result-graph')}
        className={`px-2 py-1 cursor-pointer rounded-[var(--vscode-cornerRadius-small,2px)] ${mode === 'result-graph' ? 'bg-[var(--vscode-modernTab-activeBackground)]' : 'hover:bg-[var(--vscode-modernTab-hoverBackground)]'}`}
      >
        Result Graph
      </button>
      <button type="button"
        onClick={() => onSelectMode('attack-timeline')}
        className={`px-2 py-1 cursor-pointer rounded-[var(--vscode-cornerRadius-small,2px)] ${mode === 'attack-timeline' ? 'bg-[var(--vscode-modernTab-activeBackground)]' : 'hover:bg-[var(--vscode-modernTab-hoverBackground)]'}`}
      >
        Attack Timeline
      </button>
    </div>
);

const Toolbar: React.FC<Props> = ({ testRoundIndex, testRounds, onSelectRound, mode, onSelectMode, onOpenExplorer }) => (
  <div className="flex-none p-2 flex flex-row justify-between items-center gap-2 bg-[var(--vscode-sideBar-background)]">
    <div className="flex-none flex flex-row items-center gap-2">
      <button
        type="button" onClick={onOpenExplorer}
        className="ml-1 pt-1 px-1 rounded-[var(--vscode-cornerRadius-small,2px)] hover:bg-[var(--vscode-toolbar-hoverBackground)] cursor-pointer"
        data-tooltip-id="graph-toolbar-action"
        data-tooltip-content="Graph Explorer"
      >
        <i className="codicon codicon-map text-[var(--vscode-icon-foreground)]" />
      </button>
    </div>

    <div className="flex-none flex flex-row items-center gap-2">
      <TxButton
        mode={mode}
        round={testRounds[testRoundIndex]}
        onSelectMode={onSelectMode}
      />
      <VscodeSingleSelect
        value={testRoundIndex.toString()}
        onChange={event => {
          const value = (event.target as EventTarget & { value?: string }).value;
          if (value) onSelectRound(parseInt(value, 10));
        }}
      >
        {testRounds.map((round, index) =>
          <VscodeOption key={index} value={index.toString()}>
            Round {round.id}
          </VscodeOption>
        )}
      </VscodeSingleSelect>
    </div>
  </div>
);

export default Toolbar;
