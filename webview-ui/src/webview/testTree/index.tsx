import { useEffect, useState } from 'react';

import EmptyView from './components/EmptyView';
import ErrorView from './components/ErrorView';
import TreeView from './components/TreeView';
import {
  updateTest,
  updateTestSuite,
  updateTestSuiteStatus,
  updateOpenTestTreeNode
} from './utils/treeUpdateUtils';

import type { WebviewApi } from 'vscode-webview';

interface Props {
  vscode: WebviewApi<unknown>;
}

const TestTreeView: React.FC<Props> = ({ vscode }) => {
  const [activeView, setActiveView] = useState<'loading'| 'empty' | 'noTree' | 'tree' | 'error'>('loading');
  const [testTree, setTestTree] = useState<TestTree | null>(null);

  useEffect(() => {
    vscode.postMessage({ type: 'webview-ready' } as WebviewToExtensionMessage);

    const messageHandler = (event: MessageEvent) => {
      const message = event.data as ExtensionToWebviewMessage;
      if (message.type === 'no-folders-detected') {
        if (message.payload.noFolders) {
          setActiveView('empty');
        } 
      }
      if (message.type === 'test-tree') {
        const payload = message.payload;

        if (
          payload !== null &&
          payload !== undefined &&
          payload.testTree.packages !== null &&
          Object.keys(payload.testTree.packages).length > 0
        ) {
          setTestTree(payload.testTree);
          setActiveView('tree');
        } else {
          setActiveView('noTree');
        }
      }
      // if (message.type === 'test-tree-error') {
      //   setActiveView('error');
      // }
      if (message.type === 'test-suite-update') {
        setTestTree(testTree => {
          if (!testTree) return testTree;
          return updateTestSuite({ ...testTree }, message.payload);
        });
      }
      if (message.type === 'test-update') {
        setTestTree(testTree => {
          if (!testTree) return testTree;
          return updateTest(testTree, message.payload);
        });
      }
      if (message.type === 'test-suite-status-update') {
        setTestTree(testTree => {
          if (!testTree) return testTree;
          return updateTestSuiteStatus(testTree, message.payload);
        });
      }
    };

    window.addEventListener('message', messageHandler);
    
    return () => window.removeEventListener('message', messageHandler);
  }, [vscode]);

  const onRunTests = (testIds: Array<RunTestId>) => {
    vscode.postMessage({ type: 'run-tests', payload: { testIds } } as WebviewToExtensionMessage);
  };

  const onUpdateOpenTestTreeNode = (
    isOpen: boolean,
    workspaceId: string,
    packageName: string,
    suiteName?: string,
    path?: Array<string>
  ) => {
    setTestTree(testTree => {
      if (!testTree) return testTree;
      return updateOpenTestTreeNode(
        { ...testTree },
        isOpen,
        workspaceId,
        packageName,
        suiteName,
        path
      );
    });

    vscode.postMessage({
      type: 'update-test-tree',
      payload: { isOpen, workspaceId, packageName, suiteName, path }
    } as WebviewToExtensionMessage);
  };

  return (
    <>
      {activeView === 'empty' && <EmptyView vscode={vscode} />}
      {activeView === 'noTree' && (
        <EmptyView
          vscode={vscode}
          message="No test suites found in this workspace. Open a different folder, or add a test-suite file to the open folder."
        />
      )}
      {activeView === 'error' && <ErrorView vscode={vscode} />}
      {activeView === 'tree' && testTree && (
        <TreeView
          testTree={testTree} 
          onRunTests={onRunTests}
          onUpdateOpenTestTreeNode={onUpdateOpenTestTreeNode}
        />
      )}
    </>
  )
};

export default TestTreeView;
