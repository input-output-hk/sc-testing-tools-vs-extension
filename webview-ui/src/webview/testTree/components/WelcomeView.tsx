import {
  VscodeButton,
} from '@vscode-elements/react-elements';

interface Props {
  onBuildTestList: () => void;
}

const WelcomeView: React.FC<Props> = ({ onBuildTestList }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-2">
      <img src="assets/pbt-logo.svg" className="w-20 h-20 pb-2" />
      <h1 className="text-2xl text-center font-semibold">Welcome to PBT</h1>
      <p className="text-md text-center font-medium pb-4">Scan your workspace files to get started</p>
      <VscodeButton onClick={onBuildTestList}>Run test extension</VscodeButton>
    </div>
  );
};

export default WelcomeView;