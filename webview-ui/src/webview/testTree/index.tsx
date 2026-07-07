import { useEffect, useState } from 'react';

import LoadingView from './components/LoadingView';
import TreeView from './components/TreeView';

import type { WebviewApi } from 'vscode-webview';

interface Props {
  vscode: WebviewApi<unknown>;
}

const updatePackages = (packages: TestPackageList, path: Array<string>, isOpen: boolean): TestPackageList => {
  const [packageName, suiteName, ...groupPath] = path;

  const packageNode = packages[packageName];
  if (!packageNode) return packages;

  if (suiteName === undefined) {
    packageNode.isOpen = isOpen;
    return packages;
  }

  const suiteNode = packageNode.suites[suiteName];
  if (!suiteNode) return packages;

  if (groupPath.length === 0) {
    suiteNode.isOpen = isOpen;
    return packages;
  }

  let node: TestTreeGroupNode = { type: 'group', name: '', isOpen: false, nodes: suiteNode.tree };
  for (const group of groupPath) {
    if (node.nodes[group] && node.nodes[group].type === 'group') {
      node = node.nodes[group] as TestTreeGroupNode;
    } else {
      return packages;
    }
  }

  node.isOpen = isOpen;
  return packages;
};

const updateSuite = (packages: TestPackageList, packageName: string, suiteName: string, status: TestSuiteStatus): TestPackageList => {
  const packageNode = packages[packageName];
  if (!packageNode) return packages;

  const suiteNode = packageNode.suites[suiteName];
  if (!suiteNode) return packages;

  suiteNode.status = status;
  return packages;
};

const TestTreeView: React.FC<Props> = ({ vscode }) => {
  const [activeView, setActiveView] = useState<'building'|'tree'>('building');
  const [tests, setTests] = useState<TestList|null>(null);
  const [packages, setPackages] = useState<TestPackageList|null>(null);

  useEffect(() => {
    vscode.postMessage({ type: 'webview-ready' } as WebviewToExtensionMessage);

    const messageHandler = (event: MessageEvent) => {
      const message = event.data as ExtensionToWebviewMessage;
      if (message.type === 'test-package-list') {
        if (message.payload !== null) {
          setTests(message.payload.tests);
          setPackages(message.payload.packages);
          setActiveView('tree');
        }
      }
      if (message.type === 'test-suite-tree') {
        setTests(tests => {
          const newTests = tests ? { ...tests } : {};
          for (const test of message.payload.tests) {
            newTests[test.id] = test;
          }
          return newTests;
        });
        setPackages(packages => {
          const newPackages = packages ? { ...packages } : {};
          if (newPackages[message.payload.packageName]) {
            newPackages[message.payload.packageName] = {
              ...newPackages[message.payload.packageName],
              suites: {
                ...newPackages[message.payload.packageName].suites,
                [message.payload.suiteName]: {
                  ...newPackages[message.payload.packageName].suites[message.payload.suiteName],
                  status: 'ready',
                  tree: message.payload.tree,
                },
              },
            };
          }
          return newPackages;
        });
      }
      if (message.type === 'test-update') {
        setTests(tests => {
          const newTests = tests ? { ...tests } : {};
          newTests[message.payload.test.id] = message.payload.test;
          return newTests;
        });
      }
    };

    window.addEventListener('message', messageHandler);
    
    return () => window.removeEventListener('message', messageHandler);
  }, [vscode]);

  const onBuildTestSuiteTree = (packageName: string, suiteName: string) => {
    const newPackages = updateSuite({ ...packages! }, packageName, suiteName, 'building');
    vscode.postMessage({ type: 'build-test-suite-tree', payload: { packageName, suiteName } } as WebviewToExtensionMessage);
    setPackages(newPackages);
  };

  const onToggleTreeGroup = (path: Array<string>, isOpen: boolean) => {
    const newPackages = updatePackages({ ...packages }, path, isOpen);
    vscode.postMessage({ type: 'update-test-packages-list', payload: { packages: newPackages } } as WebviewToExtensionMessage);
    setPackages(newPackages);
  };

  const onRunTest = (testIds: Array<string>) => {
    vscode.postMessage({ type: 'run-tests', payload: { testIds } } as WebviewToExtensionMessage);
  };

  return (
    <>
      {activeView === 'building' && <LoadingView />}
      {activeView === 'tree' && (
        <TreeView
          tests={tests!}
          packages={packages!}
          onRunTest={onRunTest}
          onBuildTestSuiteTree={onBuildTestSuiteTree}
          onToggleTreeGroup={onToggleTreeGroup}
        />
      )}
    </>
  )
};

export default TestTreeView;
