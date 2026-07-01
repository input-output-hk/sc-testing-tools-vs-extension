import TreeViewGroup from "./TreeViewGroup";
import TreeViewTest from "./TreeViewTest";

interface TreeViewNodeProps {
  node: TreeNode;
  path: Array<string>;
  testList: TestList;
  filterText: string;
  showAll?: boolean;
  onRunTest: (testIds: Array<number>) => void;
  onToggleTreeGroup: (path: Array<string>, isOpen: boolean) => void;
}

const TreeViewNode: React.FC<TreeViewNodeProps> = ({
  node,
  path,
  testList,
  filterText,
  showAll = false,
  onRunTest,
  onToggleTreeGroup,
}) =>
  node.type === "group" ? (
    <TreeViewGroup
      node={node as TreeGroupNode}
      path={path}
      testList={testList}
      filterText={filterText}
      showAll={showAll}
      onRunTest={onRunTest}
      onToggleTreeGroup={onToggleTreeGroup}
    />
  ) : (
    <TreeViewTest
      node={node as TreeTestNode}
      testList={testList}
      onRunTest={onRunTest}
    />
  );

export default TreeViewNode;
