import {
  VscodeSingleSelect,
  VscodeOption,
} from '@vscode-elements/react-elements';

interface Props {
  tests: Array<Test>;
  selectedTestId?: TestId;
  onTestSelected: (testId: TestId) => void;
}

const TestSelector: React.FC<Props> = ({ tests, selectedTestId, onTestSelected }) => {

  const onChange = (e: Event) => {
    const value = (e.target as EventTarget & { value?: string }).value;
    if (value) onTestSelected(value.split(':') as TestId);
  };

  return (
    <VscodeSingleSelect onChange={onChange} value={selectedTestId?.join(':')}>
      {tests.map((test, index) =>
        <VscodeOption key={index} value={test.id.join(':')}>{test.name}</VscodeOption>
      )}
    </VscodeSingleSelect>
  );
};

export default TestSelector;
