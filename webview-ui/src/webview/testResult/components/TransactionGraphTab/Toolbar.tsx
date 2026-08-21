import {
  VscodeSingleSelect,
  VscodeOption,
} from '@vscode-elements/react-elements';

interface Props {
  testRounds: Array<TestRound>;
  selectedRound: TestRound;
  onRoundChange: (round: TestRound) => void;
}

const Toolbar: React.FC<Props> = ({ selectedRound, testRounds, onRoundChange }) => (
  <div className="flex-none p-2 flex flex-row justify-between items-center bg-base-18">
    <button>
      <i className="codicon codicon-map text-[#FFFFFFCC]" />
    </button>

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
);

export default Toolbar;
