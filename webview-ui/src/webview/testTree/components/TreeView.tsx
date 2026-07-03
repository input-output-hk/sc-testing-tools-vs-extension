import { useEffect, useMemo, useRef, useState } from "react";

import { VscodeTree, VscodeTextfield } from "@vscode-elements/react-elements";

import TreeViewNode from "./TreeView/TreeViewNode";
import FilterMenu from "./TreeView/FilterMenu";
import { nodeMatchesFilter, nodeMatchesStatus } from "../utils/treeUtils";

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

  const handleFilterInput = (e: Event) => {
    setFilterText((e.target as HTMLInputElement).value);
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
      <VscodeTextfield
        className="px-2 py-1 w-full"
        placeholder="Filter (e.g. test)"
        value={filterText}
        onInput={handleFilterInput}
      >
        <span slot="content-after" ref={filterWrapperRef} className="relative inline-flex items-center">
          <i
            className="codicon codicon-filter cursor-pointer opacity-70 hover:opacity-100 mr-1"
            onClick={handleFilterToggle}
          />
          <FilterMenu isOpen={isFilterMenuOpen} statusFilter={statusFilter} onChange={handleStatusFilterChange} />
        </span>
      </VscodeTextfield>
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
