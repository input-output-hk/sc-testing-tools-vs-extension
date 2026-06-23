import {
  VscodeTree,
  VscodeTreeItem,
} from '@vscode-elements/react-elements';

type TreeNode = {
  type: "group" | "test";
};

type TreeGroupNode = TreeNode & {
  type: "group";
  name: string;
  nodes: TreeNode[];
};

type TreeTestNode = TreeNode & {
  type: "test";
  test: Test;
};

// TODO: Put this logic in another file
const createTestNode = (nodes: TreeNode[], test: Test): void => {
  let node: TreeGroupNode | null = null;
  for (const group of test.group) {
    if (node === null) {
      node = getGroupNode(nodes, group);
    } else {
      node = getGroupNode(node.nodes, group);
    }
  }
  if (node === null) {
    nodes.push({ type: 'test', test } as TreeTestNode);
  } else {
    node.nodes.push({ type: 'test', test } as TreeTestNode);
  }
}

const getGroupNode = (nodes: TreeNode[], group: string): TreeGroupNode => {
  for (const node of nodes) {
    if (node.type === 'group' && (node as TreeGroupNode).name === group) {
      return node as TreeGroupNode;
    }
  }
  const newNode: TreeGroupNode = { type: 'group', name: group, nodes: [] };
  nodes.push(newNode);
  return newNode;
}

const buildTestTree = (testList: Array<Test>): Array<TreeNode> => {
  const results: Array<TreeNode> = [];
  for (const test of testList) {
    createTestNode(results, test);
  }
  return results;
};

interface TreeViewProps {
  testList: Array<Test>;
  onRunTest: (testIds: Array<number>) => void;
}

interface TreeViewNodeProps {
  node: TreeNode;
  onRunTest: (testIds: Array<number>) => void;
}

interface TreeViewGroupProps {
  node: TreeGroupNode;
  onRunTest: (testIds: Array<number>) => void;
}

interface TreeViewTestProps {
  node: TreeTestNode;
  onRunTest: (testIds: Array<number>) => void;
}

const getGroupTestIds = (group: TreeGroupNode): Array<number> => {
  const testIds: Array<number> = [];
  for (const node of group.nodes) {
    if (node.type === 'test') {
      testIds.push((node as TreeTestNode).test.id);
    } else if (node.type === 'group') {
      testIds.push(...getGroupTestIds(node as TreeGroupNode));
    }
  }
  return testIds;
};

const TreeViewNode: React.FC<TreeViewNodeProps> = ({ node, onRunTest }) => (
  node.type === 'group' ? (
    <TreeViewGroup node={node as TreeGroupNode} onRunTest={onRunTest} />
  ) : (
    <TreeViewTest node={node as TreeTestNode} onRunTest={onRunTest} />
  )
);

const TreeViewGroup: React.FC<TreeViewGroupProps> = ({ node, onRunTest }) => (
  <VscodeTreeItem>
    <i className="codicon codicon-folder translate-y-1" slot="icon-branch" />
    <i className="codicon codicon-folder-opened translate-y-1" slot="icon-branch-opened" />
    <span className="flex flex-row w-full items-center justify-between gap-0.5">
      <span className="flex-1 min-w-0 text-base-06 overflow-hidden whitespace-nowrap text-ellipsis">
        {node.name}
      </span>
      <button
        type="button"
        className="flex h-5 w-5 shrink-0 items-center justify-center border-0 bg-transparent p-0 text-base-12 hover:text-base-06 cursor-pointer"
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
    {node.nodes.map((childNode, index) => <TreeViewNode key={index} node={childNode} onRunTest={onRunTest} />)}
  </VscodeTreeItem>
);

const TreeViewTest: React.FC<TreeViewTestProps> = ({ node, onRunTest }) => (
  <VscodeTreeItem>
    {node.test.status === 'undetermined' && <i className="codicon codicon-circle text-base-10 translate-y-0.75" slot="icon-leaf" />}
    {node.test.status === 'valid' && <i className="codicon codicon-pass text-green-01 translate-y-0.75" slot="icon-leaf" />}
    {node.test.status === 'invalid' && <i className="codicon codicon-error text-red-01 translate-y-0.75" slot="icon-leaf" />}
    {node.test.status === 'running' && <i className="codicon codicon-question text-purple-02 translate-y-0.75" slot="icon-leaf" />}
    <span className="flex flex-row w-full items-center justify-between gap-0.5">
      <span className="flex-1 min-w-0 text-base-06 overflow-hidden whitespace-nowrap text-ellipsis">
        {node.test.name}
        {(node.test.time !== undefined && node.test.time > 0) &&
          <span className="ml-1 text-base-09">
            {node.test.time.toFixed(2)}ms
          </span>
        }
      </span>
      {node.test.status !== 'running' &&
        <button
          type="button"
          className="flex h-5 w-5 shrink-0 items-center justify-center border-0 bg-transparent p-0 text-base-12 hover:text-base-06 cursor-pointer"
          onClickCapture={() => onRunTest([node.test.id])}
        >
          <i className="codicon codicon-play" />
        </button>
      }
      {node.test.status === 'running' &&
        <i className="codicon codicon-loading h-5 w-5 text-base-06 animate-spin" />
      }
    </span>
  </VscodeTreeItem>
);

// TODO: Use memoization to avoid rebuilding the tree on every render
const TreeView: React.FC<TreeViewProps> = ({ testList, onRunTest }) => (
  <div className="h-full">
    <VscodeTree>
      {buildTestTree(testList).map((node, index) =>
        <TreeViewNode
          key={index}
          node={node}
          onRunTest={onRunTest}
        />
      )}
    </VscodeTree>
  </div>
);

export default TreeView;