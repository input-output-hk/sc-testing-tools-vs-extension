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
    <button className="ml-1 pt-1 px-1 rounded-full hover:bg-base-17 active:bg-base-16 cursor-pointer">
      <i className="codicon codicon-map text-[#FFFFFFCC] active:text-white" />
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
