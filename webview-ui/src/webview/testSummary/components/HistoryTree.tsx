import { useEffect } from 'react';
import { VscodeTree, VscodeTreeItem } from '@vscode-elements/react-elements';

import type { VscodeTreeItem as VscodeTreeItemElement } from '@vscode-elements/elements/dist/vscode-tree-item/vscode-tree-item.js';

import StatusIcon from '../../../components/StatusIcon';
import TestStatusIcon from '../../../components/TestStatusIcon';
import useTreeItemState from '../../../hooks/useTreeItemState';
import {
  getGroupStatus,
  getPackageStatus,
  hasTestResults,
  isThreatModelsGroup,
  mapJobStatusToClassName,
} from '../../testTree/utils/treeUtils';
import {
  getVisibleNodes,
  getVisiblePackages,
  getVisibleSuites,
  isGroupNeverRun,
  isNeverRun,
  isPackageNeverRun,
  isSuiteNeverRun,
  type VisibleRun,
} from '../utils/historyTreeUtils';

interface TreeState {
  runId: string;
  visible: Set<VisibleItem>;
  sortBy: SortBy;
  openState: GenericMap<boolean>;
  forceOpen: boolean;
  defaultOpen: boolean;
  onToggleOpen: (key: string, isOpen: boolean) => void;
  onSelectTest: (testId: TestId, runId: string) => void;
  onOpenTestResult: (testId: TestId, runId: string) => void;
}

interface Props {
  currentRun: VisibleRun | null;
  olderRuns: Array<VisibleRun>;
  sortBy: SortBy;
  collapsedAt: number | null;
  selectCurrentAt: number | null;
  openState: GenericMap<boolean>;
  forceOpen: boolean;
  onToggleOpen: (key: string, isOpen: boolean) => void;
  onSelectTest: (testId: TestId, runId: string) => void;
  onOpenTestResult: (testId: TestId, runId: string) => void;
}

interface FolderProps {
  nodeKey: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  selectedAt?: number | null;
  openState: GenericMap<boolean>;
  forceOpen: boolean;
  onToggleOpen: (key: string, isOpen: boolean) => void;
  children: React.ReactNode;
}

interface RunProps {
  run: TestRunTree;
  tree: TreeState;
}

interface PackageProps {
  testPackage: TestPackage;
  tree: TreeState;
}

interface SuiteProps {
  suite: TestSuite;
  tree: TreeState;
}

interface NodeProps {
  node: TestTreeNode;
  suiteKey: string;
  path: Array<string>;
  tree: TreeState;
}

interface GroupProps {
  node: TestTreeGroupNode;
  suiteKey: string;
  path: Array<string>;
  tree: TreeState;
}

interface TestProps {
  test: Test;
  isThreatModel: boolean;
  tree: TreeState;
}

interface LabelProps {
  label: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  onClick?: (event: React.MouseEvent) => void;
}

const getOlderRunClassName = (status: TestJobStatus): string =>
  status === 'running' || status === 'waiting'
    ? 'codicon-question text-[var(--vscode-descriptionForeground)]'
    : mapJobStatusToClassName(status);

const deselectTreeItem = (treeItem: VscodeTreeItemElement): void => {
  treeItem.selected = false;
};

const HistoryTree: React.FC<Props> = ({ currentRun, olderRuns, sortBy, collapsedAt, selectCurrentAt, openState, forceOpen, onToggleOpen, onSelectTest, onOpenTestResult }) => {
  const isCurrentRunOpen = currentRun !== null && (collapsedAt === null || currentRun.run.startedOn > collapsedAt);

  const getTreeState = ({ run, visible }: VisibleRun, defaultOpen: boolean): TreeState => ({
    runId: run.runId, visible, sortBy, openState, forceOpen, defaultOpen, onToggleOpen, onSelectTest, onOpenTestResult,
  });

  return (
    <VscodeTree>
      {currentRun !== null && (
        <HistoryFolder nodeKey="current" label="Current testrun" defaultOpen={isCurrentRunOpen} selectedAt={selectCurrentAt} openState={openState} forceOpen={forceOpen} onToggleOpen={onToggleOpen}>
          <HistoryRun run={currentRun.run} tree={getTreeState(currentRun, isCurrentRunOpen)} />
        </HistoryFolder>
      )}
      {olderRuns.length > 0 && (
        <HistoryFolder nodeKey="older" label={`${olderRuns.length} older results`} defaultOpen={collapsedAt === null} openState={openState} forceOpen={forceOpen} onToggleOpen={onToggleOpen}>
          {olderRuns.map(({ run, visible }) => (
            <HistoryFolder
              key={run.runId}
              nodeKey={run.runId}
              icon={<StatusIcon className={`shrink-0 ${getOlderRunClassName(run.status)}`} />}
              label={`Test Run at ${new Date(run.startedOn).toLocaleString()}`}
              openState={openState}
              forceOpen={forceOpen}
              onToggleOpen={onToggleOpen}
            >
              <HistoryRun run={run} tree={getTreeState({ run, visible }, false)} />
            </HistoryFolder>
          ))}
        </HistoryFolder>
      )}
    </VscodeTree>
  );
};

const HistoryFolder: React.FC<FolderProps> = ({ nodeKey, label, description, icon, defaultOpen = false, selectedAt = null, openState, forceOpen, onToggleOpen, children }) => {
  const handleToggleCollapsed = (isCollapsed: boolean) => {
    onToggleOpen(nodeKey, !isCollapsed);
  };
  const treeItemRef = useTreeItemState({ onToggleCollapsed: handleToggleCollapsed });

  useEffect(() => {
    const treeItem = treeItemRef.current;
    if (selectedAt === null || treeItem === null) return;
    treeItem.closest('vscode-tree')?.querySelectorAll<VscodeTreeItemElement>('vscode-tree-item[selected]').forEach(deselectTreeItem);
    treeItem.selected = true;
    onToggleOpen(nodeKey, true);
    treeItem.scrollIntoView({ block: 'nearest' });
  }, [selectedAt]);

  return (
    <VscodeTreeItem ref={treeItemRef} open={forceOpen || (openState[nodeKey] ?? defaultOpen)}>
      <HistoryLabel label={label} description={description} icon={icon} />
      {children}
    </VscodeTreeItem>
  );
};

const NeverRunIcon: React.FC = () => (
  <StatusIcon className="shrink-0 codicon-question text-[var(--vscode-descriptionForeground)]" />
);

const HistoryRun: React.FC<RunProps> = ({ run, tree }) => (
  <>
    {getVisiblePackages(run.testTree, tree.visible, tree.sortBy).map(testPackage => (
      <HistoryPackage key={testPackage.id.join(':')} testPackage={testPackage} tree={tree} />
    ))}
  </>
);

const HistoryPackage: React.FC<PackageProps> = ({ testPackage, tree }) => (
  <HistoryFolder
    nodeKey={`${tree.runId}:${testPackage.id.join(':')}`}
    icon={isPackageNeverRun(testPackage) ? <NeverRunIcon /> : <TestStatusIcon status={getPackageStatus(testPackage)} />}
    label={testPackage.name}
    defaultOpen={tree.defaultOpen}
    openState={tree.openState}
    forceOpen={tree.forceOpen}
    onToggleOpen={tree.onToggleOpen}
  >
    {getVisibleSuites(testPackage, tree.visible, tree.sortBy).map(suite => (
      <HistorySuite key={suite.name} suite={suite} tree={tree} />
    ))}
    </HistoryFolder>
);

const HistorySuite: React.FC<SuiteProps> = ({ suite, tree }) => {
  const suiteKey = `${tree.runId}:${suite.id.join(':')}`;

  return (
    <HistoryFolder
      nodeKey={suiteKey}
      icon={isSuiteNeverRun(suite)
        ? <NeverRunIcon />
        : <TestStatusIcon status={{ status: suite.status, isWaiting: suite.isWaiting, isBuilding: suite.isBuilding, isRunning: suite.isRunning }} />}
      label={suite.name}
      defaultOpen={tree.defaultOpen}
      openState={tree.openState}
      forceOpen={tree.forceOpen}
      onToggleOpen={tree.onToggleOpen}
    >
      {getVisibleNodes(suite.tests, tree.visible, tree.sortBy).map(node => (
        <HistoryNode key={getNodeKey(node)} node={node} suiteKey={suiteKey} path={[]} tree={tree} />
      ))}
    </HistoryFolder>
  );
};

const getNodeKey = (node: TestTreeNode): string =>
  node.type === 'group' ? `group:${(node as TestTreeGroupNode).name}` : (node as TestTreeTestNode).test.id.join(':');

const HistoryNode: React.FC<NodeProps> = ({ node, suiteKey, path, tree }) =>
  node.type === 'group'
    ? <HistoryGroup node={node as TestTreeGroupNode} suiteKey={suiteKey} path={path} tree={tree} />
    : <HistoryTest
        test={(node as TestTreeTestNode).test}
        isThreatModel={path.length > 0 && isThreatModelsGroup(path[path.length - 1])}
        tree={tree}
      />;

const HistoryGroup: React.FC<GroupProps> = ({ node, suiteKey, path, tree }) => {
  const groupPath = [...path, node.name];
  const status = getGroupStatus(node);
  const isThreatModel = isThreatModelsGroup(node.name);

  return (
    <HistoryFolder
      nodeKey={`${suiteKey}:${groupPath.join(':')}`}
      icon={isGroupNeverRun(node) ? <NeverRunIcon /> : <TestStatusIcon status={status} isThreatModel={isThreatModel} />}
      label={node.name}
      description={isThreatModel ? `(${Object.keys(node.nodes).length})` : undefined}
      defaultOpen={tree.defaultOpen}
      openState={tree.openState}
      forceOpen={tree.forceOpen}
      onToggleOpen={tree.onToggleOpen}
    >
      {getVisibleNodes(node.nodes, tree.visible, tree.sortBy).map(child => (
        <HistoryNode key={getNodeKey(child)} node={child} suiteKey={suiteKey} path={groupPath} tree={tree} />
      ))}
    </HistoryFolder>
  );
};

const HistoryTest: React.FC<TestProps> = ({ test, isThreatModel, tree }) => {
  const isTestNeverRun = isNeverRun(test);

  const handleClick = (event: React.MouseEvent) => {
    if ((event.target as HTMLElement).closest('button')) return;
    tree.onSelectTest(test.id, tree.runId);
  };

  const handleOpenTestResult = (event: React.MouseEvent<HTMLButtonElement>): void => {
    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
    tree.onOpenTestResult(test.id, tree.runId);
  };

  return (
    <VscodeTreeItem>
      <HistoryLabel
        icon={isTestNeverRun ? <NeverRunIcon /> : <TestStatusIcon status={test} isThreatModel={isThreatModel} />}
        label={test.name}
        action={hasTestResults(test) && !isTestNeverRun &&
          <button
            type="button"
            className="flex h-5 w-5 shrink-0 items-center justify-center border-0 bg-transparent p-0 opacity-60 hover:opacity-100 cursor-pointer"
            onClickCapture={handleOpenTestResult}
            data-tooltip-id="tree-node-action"
            data-tooltip-content="View Results"
          >
            <i className="codicon codicon-tasklist" />
          </button>
        }
        onClick={handleClick}
      />
    </VscodeTreeItem>
  );
};

const HistoryLabel: React.FC<LabelProps> = ({ icon, label, description, action, onClick }) => (
  <span onClickCapture={onClick} className="flex flex-row w-full items-center gap-1.5 cursor-pointer min-w-0">
    {icon}
    <span className="shrink-0 text-[var(--vscode-foreground)] text-[13px]">{label}</span>
    {description !== undefined && (
      <span className="flex-1 min-w-0 overflow-hidden whitespace-nowrap text-ellipsis text-[var(--vscode-descriptionForeground)] text-[11px]">
        {description}
      </span>
    )}
    {action && (
      <span className="shrink-0 ml-auto flex flex-row items-center">
        {action}
      </span>
    )}
  </span>
);

export default HistoryTree;
