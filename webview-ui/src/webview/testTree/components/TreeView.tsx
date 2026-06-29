import { useEffect, useRef } from 'react';

import {
  VscodeTree,
  VscodeTreeItem,
} from '@vscode-elements/react-elements';

import TestStatusIcon from '../../../components/TestStatusIcon';

import type { VscodeTreeItem as VscodeTreeItemElement } from '@vscode-elements/elements/dist/vscode-tree-item/vscode-tree-item.js';


interface TreeViewProps {
  testTree: TestTree;
  testList: TestList;
  onRunTest: (testIds: Array<number>) => void;
  onToggleTreeGroup: (path: Array<string>, isOpen: boolean) => void;
}

interface TreeViewNodeProps {
  node: TreeNode;
  path: Array<string>;
  testList: TestList;
  onRunTest: (testIds: Array<number>) => void;
  onToggleTreeGroup: (path: Array<string>, isOpen: boolean) => void;
}

interface TreeViewGroupProps {
  node: TreeGroupNode;
  path: Array<string>;
  testList: TestList;
  onRunTest: (testIds: Array<number>) => void;
  onToggleTreeGroup: (path: Array<string>, isOpen: boolean) => void;
}

interface TreeViewTestProps {
  node: TreeTestNode;
  testList: TestList;
  onRunTest: (testIds: Array<number>) => void;
}

const getGroupTestIds = (group: TreeGroupNode): Array<number> => {
  const testIds: Array<number> = [];
  for (const node of Object.values(group.nodes)) {
    if (node.type === 'test') {
      testIds.push((node as TreeTestNode).testId);
    } else if (node.type === 'group') {
      testIds.push(...getGroupTestIds(node as TreeGroupNode));
    }
  }
  return testIds;
};

const TreeViewNode: React.FC<TreeViewNodeProps> = ({ node, path, testList, onRunTest, onToggleTreeGroup }) => (
  node.type === 'group' ? (
    <TreeViewGroup node={node as TreeGroupNode} path={path} testList={testList} onRunTest={onRunTest} onToggleTreeGroup={onToggleTreeGroup} />
  ) : (
    <TreeViewTest node={node as TreeTestNode} testList={testList} onRunTest={onRunTest} />
  )
);

const TreeViewGroup: React.FC<TreeViewGroupProps> = ({ node, path, testList, onRunTest, onToggleTreeGroup }) => {
  const treeItemRef = useRef<VscodeTreeItemElement | null>(null);

  useEffect(() => {
    const treeItem = treeItemRef.current;
    if (!treeItem) {
      return;
    }

    const observer = new MutationObserver((mutations) => {
      if (!mutations.some((mutation) => mutation.attributeName === 'open')) {
        return;
      }

      const isOpen = treeItem.hasAttribute('open');
      if (isOpen !== node.isOpen) {
        onToggleTreeGroup(path, isOpen);
      }
    });

    observer.observe(treeItem, {
      attributes: true,
      attributeFilter: ['open'],
    });

    return () => {
      observer.disconnect();
    };
  }, [node.isOpen, onToggleTreeGroup, path]);

  return (
    <VscodeTreeItem ref={treeItemRef} open={node.isOpen}>
      <i className="codicon codicon-folder translate-y-1" slot="icon-branch" />
      <i className="codicon codicon-folder-opened translate-y-1" slot="icon-branch-opened" />
      <span className="flex flex-row w-full items-center justify-between gap-0.5">
        <span className="flex-1 min-w-0 overflow-hidden whitespace-nowrap text-ellipsis">
          {node.name}
        </span>
        <button
          type="button"
          className="flex h-5 w-5 shrink-0 items-center justify-center border-0 bg-transparent p-0 opacity-60 hover:opacity-100 cursor-pointer"
          onClickCapture={(event) => {
            event.preventDefault();
            event.stopPropagation();
            event.nativeEvent.stopImmediatePropagation();
            onRunTest(getGroupTestIds(node));
          }}
        >
          <i className="codicon codicon-run-all" />
        </button>
      </span>
      {Object.keys(node.nodes).map((key, index) =>
        <TreeViewNode
          key={index}
          node={node.nodes[key]}
          path={[...path, key]}
          testList={testList}
          onRunTest={onRunTest}
          onToggleTreeGroup={onToggleTreeGroup}
        />
      )}
    </VscodeTreeItem>
  );
};

const TreeViewTest: React.FC<TreeViewTestProps> = ({ node, testList, onRunTest }) => {
  const test = testList[node.testId];
  return (
    <VscodeTreeItem>
      <TestStatusIcon status={test.status} />
      <span className="flex flex-row w-full items-center justify-between gap-0.5">
        <span className="flex-1 min-w-0 overflow-hidden whitespace-nowrap text-ellipsis">
          {test.name}
          {(test.time !== undefined && test.time > 0) &&
            <span className="ml-1 opacity-60">
              {test.time.toFixed(2)}ms
            </span>
          }
        </span>
        {test.status !== 'running' &&
          <button
            type="button"
            className="flex h-5 w-5 shrink-0 items-center justify-center border-0 bg-transparent p-0 opacity-60 hover:opacity-100 cursor-pointer"
            onClickCapture={() => onRunTest([test.id])}
          >
            <i className="codicon codicon-play" />
          </button>
        }
        {test.status === 'running' &&
          <i className="codicon codicon-loading h-5 w-5 animate-spin" />
        }
      </span>
    </VscodeTreeItem>
  );
};

const TreeView: React.FC<TreeViewProps> = ({ testTree, testList, onRunTest, onToggleTreeGroup }) => (
  <div className="h-full overflow-y-scroll">
    <VscodeTree>
      {Object.keys(testTree).map((key, index) =>
        <TreeViewNode
          key={index}
          node={testTree[key]}
          path={[key]}
          testList={testList}
          onRunTest={onRunTest}
          onToggleTreeGroup={onToggleTreeGroup}
        />
      )}
    </VscodeTree>
  </div>
);

export default TreeView;