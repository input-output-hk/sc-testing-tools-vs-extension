import { useEffect, useState } from 'react';

import WelcomeView from './components/WelcomeView';
import LoadingView from './components/LoadingView';
import TreeView from './components/TreeView';

import type { WebviewApi } from 'vscode-webview';

interface Props {
  vscode: WebviewApi<unknown>;
}

const updateTestTreeGroupNode = (testTree: TestTree, path: Array<string>, isOpen: boolean): TestTree => {
  let node: TreeGroupNode = { type: 'group', name: '', isOpen: false, nodes: testTree };
  for (const group of path) {
    if (node.nodes[group] && node.nodes[group].type === 'group') {
      node = node.nodes[group] as TreeGroupNode;
    } else {
      return testTree;
    }
  }
  node.isOpen = isOpen;
  return testTree;
};

const TestTreeView: React.FC<Props> = ({ vscode }) => {
  const [activeView, setActiveView] = useState<'welcome'|'building'|'tree'>('welcome');
  const [testList, setTestList] = useState<TestList|null>(null);
  const [testTree, setTestTree] = useState<TestTree|null>(null);

  useEffect(() => {
    vscode.postMessage({ type: 'webview-ready' } as WebviewToExtensionMessage);

    const messageHandler = (event: MessageEvent) => {
      const message = event.data as ExtensionToWebviewMessage;
      if (message.type === 'test-suite') {
        setTestList(message.payload.testList);
        setTestTree(message.payload.testTree);
        setActiveView('tree');
      }
      if (message.type === 'test-update') {
        setTestList(list => {
          if (!list) return null;
          return { ...list, [message.payload.test.id]: message.payload.test };
        });
      }
    };

    window.addEventListener('message', messageHandler);
    
    return () => window.removeEventListener('message', messageHandler);
  }, [vscode]);

  const onBuildTestList = () => {
    setActiveView('building');
    vscode.postMessage({ type: 'build-test-suite' } as WebviewToExtensionMessage);
  };

  const onToggleTreeGroup = (path: Array<string>, isOpen: boolean) => {
    const newTestTree = updateTestTreeGroupNode({ ...testTree! }, path, isOpen);
    vscode.postMessage({ type: 'update-test-tree', payload: { testTree: newTestTree } } as WebviewToExtensionMessage);
    setTestTree(newTestTree);
  };

  const onRunTest = (testIds: Array<number>) => {
    vscode.postMessage({ type: 'run-test', payload: { testIds } } as WebviewToExtensionMessage);
  };

  return (
    <>
      {activeView === 'welcome' && <WelcomeView onBuildTestList={onBuildTestList} />}
      {activeView === 'building' && <LoadingView />}
      {activeView === 'tree' && (
        <TreeView
          testTree={testTree!}
          testList={testList!}
          onRunTest={onRunTest}
          onToggleTreeGroup={onToggleTreeGroup}
        />
      )}
    </>
  )
};

export default TestTreeView;
