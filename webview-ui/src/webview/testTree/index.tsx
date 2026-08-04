import { useEffect, useState } from 'react';

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
  const [testTree, setTestTree] = useState<TestTree | null>(null);

  useEffect(() => {
    vscode.postMessage({ type: 'webview-ready' } as WebviewToExtensionMessage);

    const messageHandler = (event: MessageEvent) => {
      const message = event.data as ExtensionToWebviewMessage;
      if (message.type === 'test-tree') {
        setTestTree(message.payload.testTree);
      }
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

  const onOpenTestResult = (testId: TestId) => {
    vscode.postMessage({ type: 'open-test-results', payload: { testId } } as WebviewToExtensionMessage);
  };

  if (testTree === null) return <></>;

  return (
    <TreeView
      testTree={testTree}
      onRunTests={onRunTests}
      onUpdateOpenTestTreeNode={onUpdateOpenTestTreeNode}
      onOpenTestResult={onOpenTestResult}
    />
  )
};

export default TestTreeView;
