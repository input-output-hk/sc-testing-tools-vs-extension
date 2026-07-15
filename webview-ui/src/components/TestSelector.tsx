import {
  VscodeSingleSelect,
  VscodeOption,
} from '@vscode-elements/react-elements';

interface Props {
  tests: TestList;
  selectedTestId?: string;
  onTestSelected: (testId: string) => void;
}

const TestSelector: React.FC<Props> = ({ tests, selectedTestId, onTestSelected }) => {

  const onChange = (e: Event) => {
    const value = (e.target as EventTarget & { value?: string }).value;
    if (value) onTestSelected(value);
  };

  return (
    <VscodeSingleSelect onChange={onChange} value={selectedTestId}>
      {Object.values(tests).map((test) =>
        <VscodeOption key={test.id} value={test.id}>{test.name}</VscodeOption>
      )}
    </VscodeSingleSelect>
  );
};

export default TestSelector;
