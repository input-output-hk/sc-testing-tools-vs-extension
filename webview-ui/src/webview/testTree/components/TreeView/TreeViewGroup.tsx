import { useEffect, useMemo, useRef } from "react";

import { VscodeTreeItem } from "@vscode-elements/react-elements";
import type { VscodeTreeItem as VscodeTreeItemElement } from "@vscode-elements/elements/dist/vscode-tree-item/vscode-tree-item.js";

import TreeViewNode from "./TreeViewNode";
import { getGroupTestIds, nodeMatchesFilter } from "../../utils/treeUtils";

interface TreeViewGroupProps {
  node: TreeGroupNode;
  path: Array<string>;
  testList: TestList;
  filterText: string;
  showAll: boolean;
  onRunTest: (testIds: Array<number>) => void;
  onToggleTreeGroup: (path: Array<string>, isOpen: boolean) => void;
}

const TreeViewGroup: React.FC<TreeViewGroupProps> = ({
  node,
  path,
  testList,
  filterText,
  showAll,
  onRunTest,
  onToggleTreeGroup,
}) => {
  const treeItemRef = useRef<VscodeTreeItemElement | null>(null);

  const showAllChildren =
    showAll ||
    !filterText ||
    node.name.toLowerCase().includes(filterText.toLowerCase());

  const filteredNodes = useMemo(() => {
    if (showAllChildren) {
      return Object.keys(node.nodes);
    }
    return Object.keys(node.nodes).filter((key) =>
      nodeMatchesFilter(node.nodes[key], filterText, testList),
    );
  }, [node.nodes, filterText, testList, showAllChildren]);

  useEffect(() => {
    const treeItem = treeItemRef.current;
    if (!treeItem) {
      return;
    }

    const observer = new MutationObserver((mutations) => {
      if (!mutations.some((mutation) => mutation.attributeName === "open")) {
        return;
      }

      const isOpen = treeItem.hasAttribute("open");
      if (isOpen !== node.isOpen) {
        onToggleTreeGroup(path, isOpen);
      }
    });

    observer.observe(treeItem, {
      attributes: true,
      attributeFilter: ["open"],
    });

    return () => {
      observer.disconnect();
    };
  }, [node.isOpen, onToggleTreeGroup, path]);

  const handleRunGroup = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
    const visibleNodes = Object.fromEntries(
      filteredNodes.map((key) => [key, node.nodes[key]]),
    );
    onRunTest(getGroupTestIds({ ...node, nodes: visibleNodes }));
  };

  return (
    <VscodeTreeItem ref={treeItemRef} open={node.isOpen}>
      <i className="codicon codicon-folder translate-y-1" slot="icon-branch" />
      <i
        className="codicon codicon-folder-opened translate-y-1"
        slot="icon-branch-opened"
      />
      <span className="flex flex-row w-full items-center justify-between gap-0.5">
        <span className="flex-1 min-w-0 overflow-hidden whitespace-nowrap text-ellipsis">
          {node.name}
        </span>
        <button
          type="button"
          className="flex h-5 w-5 shrink-0 items-center justify-center border-0 bg-transparent p-0 opacity-60 hover:opacity-100 cursor-pointer"
          onClickCapture={handleRunGroup}
        >
          <i className="codicon codicon-run-all" />
        </button>
      </span>
      {filteredNodes.map((key) => (
        <TreeViewNode
          key={key}
          node={node.nodes[key]}
          path={[...path, key]}
          testList={testList}
          filterText={filterText}
          showAll={showAllChildren}
          onRunTest={onRunTest}
          onToggleTreeGroup={onToggleTreeGroup}
        />
      ))}
    </VscodeTreeItem>
  );
};

export default TreeViewGroup;
