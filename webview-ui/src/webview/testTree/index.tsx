import { useEffect, useState } from 'react';

import EmptyView from './components/EmptyView';
import ErrorView from './components/ErrorView';
import TreeView from './components/TreeView';

import {
  updateTest,
  updateTestSuite,
  updateOpenTestTreeNode
} from './utils/treeUpdateUtils';

import type { WebviewApi } from 'vscode-webview';

interface Props {
  vscode: WebviewApi<unknown>;
}

const TestTreeView: React.FC<Props> = ({ vscode }) => {
  const [activeView, setActiveView] = useState<null | 'empty-workspaces' | 'empty-tree' | 'tree' | 'error'>(null);
  const [testTree, setTestTree] = useState<TestTree | null>(null);
  const [testJob, setTestJob] = useState<TestJob | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>('location');

  useEffect(() => {
    vscode.postMessage({ type: 'webview-ready' } as WebviewToExtensionMessage);

    const messageHandler = (event: MessageEvent) => {
      const message = event.data as ExtensionToWebviewMessage;
      if (message.type === 'status-empty-workspaces') {
        setActiveView('empty-workspaces');
      }
      if (message.type === 'test-tree-error') {
        setActiveView('error');
      }
      if (message.type === 'test-tree') {
        setTestTree(message.payload.testTree);
        setActiveView(Object.keys(message.payload.testTree.packages).length ? 'tree' : 'empty-tree');
      }
      if (message.type === 'test-tree-update') {
        setTestTree(testTree => {
          if (!testTree) return testTree;
          switch (message.payload.type) {
            case 'test':
              return updateTest(testTree, message.payload.test);
            case 'suite':
              return updateTestSuite(testTree, message.payload.suite);
          }
        });
      }
      if (message.type === 'test-tree-test-run-update') {
        setTestJob(message.payload.job);
      }
      if (message.type === 'test-tree-set-sort') {
        setSortBy(message.payload.sortBy);
      }
    };

    window.addEventListener('message', messageHandler);
    
    return () => window.removeEventListener('message', messageHandler);
  }, [vscode]);

  const onRunTest = (testIds: Array<RunnableTestId>) => {
    vscode.postMessage({ type: 'test-tree-run', payload: { testIds } } as WebviewToExtensionMessage);
  };

  const onBuildTestSuite = (suiteId: TestSuiteId) => {
    vscode.postMessage({ type: 'test-tree-build-suite', payload: { suiteId } } as WebviewToExtensionMessage)
  }

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
      type: 'test-tree-update-open-state',
      payload: { isOpen, workspaceId, packageName, suiteName, path }
    } as WebviewToExtensionMessage);
  };

  const onOpenTestResult = (testId: TestId) => {
    vscode.postMessage({ type: 'test-tree-open-results', payload: { testId } } as WebviewToExtensionMessage);
  };

  const onShowCoverage = (test: Test) => {
    vscode.postMessage({
      type: 'test-tree-show-coverage',
      payload: { testId: test.id, testName: test.name, group: test.group }
    } as WebviewToExtensionMessage);
  };

  const onShowTestLocation = (testId: TestId) => {
    vscode.postMessage({ type: 'test-tree-show-location', payload: { testId } } as WebviewToExtensionMessage);
  };

  return (
    <>
      {activeView === 'error' &&
        <ErrorView vscode={vscode} />
      }
      {activeView === 'empty-workspaces' &&
        <EmptyView
          vscode={vscode}
          message="empty-workspaces"
        />
      }
      {activeView === 'empty-tree' &&
        <EmptyView
          vscode={vscode}
          message="empty-tree"
        />
      }
      {activeView === 'tree' && testTree !== null &&
        <TreeView
          testJob={testJob}
          testTree={testTree}
          sortBy={sortBy}
          onRunTest={onRunTest}
          onBuildTestSuite={onBuildTestSuite}
          onUpdateOpenTestTreeNode={onUpdateOpenTestTreeNode}
          onOpenTestResult={onOpenTestResult}
          onShowCoverage={onShowCoverage}
          onShowTestLocation={onShowTestLocation}
        />
      }
    </>
  )
};

export default TestTreeView;