import { useMemo, useState } from "react";

import { VscodeTree } from "@vscode-elements/react-elements";

import TreeViewNode from "./TreeViewNode";
import { nodeMatchesFilter } from "../../utils/treeUtils";

interface TreeViewProps {
  testTree: TestTree;
  testList: TestList;
  onRunTest: (testIds: Array<number>) => void;
  onToggleTreeGroup: (path: Array<string>, isOpen: boolean) => void;
}

const TreeView: React.FC<TreeViewProps> = ({
  testTree,
  testList,
  onRunTest,
  onToggleTreeGroup,
}) => {
  const [filterText, setFilterText] = useState("");

  const handleFilterInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterText(e.target.value);
  };

  const handleFilterToggle = () => {
    console.log("filter toggle clicked");
  };

  const filteredRoots = useMemo(
    () =>
      Object.keys(testTree).filter(
        (key) =>
          !filterText || nodeMatchesFilter(testTree[key], filterText, testList),
      ),
    [testTree, filterText, testList],
  );

  return (
    <div className="h-full flex flex-col">
      <div className="relative flex items-center w-full px-2 py-2">
        <input
          type="text"
          className="w-full pl-2 pr-6 py-1 text-sm rounded border border-transparent bg-[#3c3c3c] text-base-06 outline-none focus:border-blue-06 placeholder:text-base-06"
          placeholder="Filter (e.g. test)"
          value={filterText}
          onChange={handleFilterInput}
        />
        <i
          className="codicon codicon-filter cursor-pointer text-base-06 opacity-70 hover:opacity-100 absolute right-3"
          onClick={handleFilterToggle}
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        <VscodeTree>
          {filteredRoots.map((key) => (
            <TreeViewNode
              key={key}
              node={testTree[key]}
              path={[key]}
              testList={testList}
              filterText={filterText}
              onRunTest={onRunTest}
              onToggleTreeGroup={onToggleTreeGroup}
            />
          ))}
        </VscodeTree>
      </div>
    </div>
  );
};

export default TreeView;
