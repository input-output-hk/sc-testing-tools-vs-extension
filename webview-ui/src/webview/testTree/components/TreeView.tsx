import { useMemo, useState } from 'react';

import { VscodeTree, VscodeTextfield } from '@vscode-elements/react-elements';

import TreeViewNode from './TreeView/TreeViewNode';
import { nodeMatchesFilter } from '../utils/treeUtils';

interface TreeViewProps {
  testTree: TestTree;
  testList: TestList;
  onRunTest: (testIds: Array<number>) => void;
  onToggleTreeGroup: (path: Array<string>, isOpen: boolean) => void;
}

const TreeView: React.FC<TreeViewProps> = ({ testTree, testList, onRunTest, onToggleTreeGroup }) => {
  const [filterText, setFilterText] = useState('');

  const handleFilterInput = (e: Event) => {
    setFilterText((e.target as HTMLInputElement).value);
  };

  const handleFilterToggle = () => {
    console.log('filter toggle clicked');
  };

  const filteredRoots = useMemo(
    () => Object.keys(testTree).filter((key) => !filterText || nodeMatchesFilter(testTree[key], filterText, testList)),
    [testTree, filterText, testList]
  );

  return (
    <div className="h-full overflow-y-scroll">
      <VscodeTextfield
        className="px-2 py-1 w-full"
        placeholder="Filter (e.g. test)"
        value={filterText}
        onInput={handleFilterInput}
      >
        <i
          slot="content-after"
          className="codicon codicon-filter cursor-pointer opacity-70 hover:opacity-100 mr-1"
          onClick={handleFilterToggle}
        />
      </VscodeTextfield>
      <VscodeTree>
        {filteredRoots.map((key) =>
          <TreeViewNode
            key={key}
            node={testTree[key]}
            path={[key]}
            testList={testList}
            filterText={filterText}
            onRunTest={onRunTest}
            onToggleTreeGroup={onToggleTreeGroup}
          />
        )}
      </VscodeTree>
    </div>
  );
};

export default TreeView;
