import {
  VscodeProgressBar,
} from '@vscode-elements/react-elements';

const LoadingView: React.FC = () => (
  <div className="h-full">
    <VscodeProgressBar />
    <div className="flex flex-col items-center justify-center gap-2 h-full">
      <p className="text-md text-center font-medium pb-4">Building tree view...</p>
    </div>
  </div>
);

export default LoadingView;