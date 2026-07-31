import type { WebviewApi } from 'vscode-webview';

interface TestCoverageProps {
  vscode?: WebviewApi<unknown>
}
const TestCoverageView: React.FC<TestCoverageProps> = () => {
  return <div className="h-full p-4">test coverage</div>;
};

export default TestCoverageView;
