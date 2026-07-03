import { useEffect, useMemo, useRef, useState } from "react";

import { VscodeTree } from "@vscode-elements/react-elements";

import TreeViewNode from "./TreeViewNode";
import FilterMenu from "./FilterMenu";
import { nodeMatchesFilter, nodeMatchesStatus } from "../../utils/treeUtils";

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
  const [statusFilter, setStatusFilter] = useState<TestStatus | null>(null);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const filterWrapperRef = useRef<HTMLSpanElement | null>(null);

  const handleFilterInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterText(e.target.value);
  };

  const handleFilterToggle = () => {
    setIsFilterMenuOpen((open) => !open);
  };

  const handleStatusFilterChange = (nextStatusFilter: TestStatus | null) => {
    setStatusFilter(nextStatusFilter);
    setIsFilterMenuOpen(false);
  };

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      const wrapper = filterWrapperRef.current;
      if (wrapper && !wrapper.contains(event.target as Node)) {
        setIsFilterMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsFilterMenuOpen(false);
      }
    };

    document.addEventListener("click", handleDocumentClick, true);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const filteredRoots = useMemo(
    () =>
      Object.keys(testTree).filter(
        (key) =>
          nodeMatchesStatus(testTree[key], statusFilter, testList) &&
          (!filterText || nodeMatchesFilter(testTree[key], filterText, testList)),
      ),
    [testTree, filterText, statusFilter, testList],
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
        <span ref={filterWrapperRef} className="absolute right-3 inline-flex items-center">
          <i
            className="codicon codicon-filter cursor-pointer text-base-06 opacity-70 hover:opacity-100"
            onClick={handleFilterToggle}
          />
          <FilterMenu isOpen={isFilterMenuOpen} statusFilter={statusFilter} onChange={handleStatusFilterChange} />
        </span>
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
              statusFilter={statusFilter}
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
