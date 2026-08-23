import {
  VscodeSingleSelect,
  VscodeOption,
  VscodeButton,
  VscodeButtonGroup
} from '@vscode-elements/react-elements';

interface Props {
  testRounds: Array<TestRound>;
  selectedRound: TestRound;
  onRoundChange: (round: TestRound) => void;
  txType: TxType;
  onSelectTxType: (tx: TxType) => void;
}

interface TxButtonProps {
  round: TestRound;
  txType: TxType;
  onSelectTxType: (tx: TxType) => void;
}

const TxButton: React.FC<TxButtonProps> = ({ round, txType, onSelectTxType }) => (
  round.type === 'threat-model' &&
    <VscodeButtonGroup>
      <VscodeButton secondary
        onClick={() => onSelectTxType('original')}
        className={txType === 'original' ? 'bg-base-14' : ''}
        style={{ '--vscode-button-border': 'transparent' } as React.CSSProperties}
      >
        Original Tx
      </VscodeButton>
      <VscodeButton secondary
        onClick={() => onSelectTxType('modified')}
        className={txType === 'modified' ? 'bg-base-14' : ''}
        style={{ '--vscode-button-border': 'transparent' } as React.CSSProperties}
      >
        Modified Tx
      </VscodeButton>
    </VscodeButtonGroup>
);

const Toolbar: React.FC<Props> = ({ selectedRound, testRounds, onRoundChange, txType, onSelectTxType }) => (
  <div className="flex-none p-2 flex flex-row justify-between items-center bg-base-18">
    <button className="ml-1 pt-1 px-1 rounded-full hover:bg-base-17 active:bg-base-16 cursor-pointer">
      <i className="codicon codicon-map text-[#FFFFFFCC] active:text-white" />
    </button>

    <div className="flex-none flex flex-row items-center gap-2">
      <TxButton
        round={selectedRound}
        txType={txType}
        onSelectTxType={onSelectTxType}
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
