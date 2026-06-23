import { useEffect, useState } from 'react';

import WelcomeView from './components/WelcomeView';
import LoadingView from './components/LoadingView';
import TreeView from './components/TreeView';

import type { WebviewApi } from 'vscode-webview';

interface Props {
  vscode: WebviewApi<unknown>;
}

const TestTreeView: React.FC<Props> = ({ vscode }) => {
  const [activeView, setActiveView] = useState<'welcome'|'building'|'tree'>('welcome');
  const [testList, setTestList] = useState<Array<Test>|null>(null);

  useEffect(() => {
    vscode.postMessage({ type: 'webview-ready' } as WebviewToExtensionMessage);

    const messageHandler = (event: MessageEvent) => {
      const message = event.data as ExtensionToWebviewMessage;
      if (message.type === 'test-list') {
        setTestList(message.payload.testList);
        setActiveView('tree');
      }
      if (message.type === 'test-result') {
        const updatedTest = message.payload.test;
        setTestList((prevTestList) => {
          if (prevTestList === null) return prevTestList;
          return prevTestList.map((test) => (test.id === updatedTest.id ? updatedTest : test));
        });
      }
    };

    window.addEventListener('message', messageHandler);
    
    return () => window.removeEventListener('message', messageHandler);
  }, [vscode]);

  const onBuildTestList = () => {
    setActiveView('building');
    vscode.postMessage({ type: 'build-test-list' } as WebviewToExtensionMessage);
  };

  const onRunTest = (testIds: Array<number>) => {
    vscode.postMessage({ type: 'run-test', payload: { testIds } } as WebviewToExtensionMessage);
  }

  return (
    <>
      {activeView === 'welcome' && <WelcomeView onBuildTestList={onBuildTestList} />}
      {activeView === 'building' && <LoadingView />}
      {activeView === 'tree' && (
        <TreeView
          testList={testList!}
          onRunTest={onRunTest}
        />
      )}
    </>
  )
};

export default TestTreeView;
