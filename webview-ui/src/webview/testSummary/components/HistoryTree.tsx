import { VscodeTree, VscodeTreeItem } from '@vscode-elements/react-elements';

import StatusIcon from '../../../components/StatusIcon';
import TestStatusIcon from '../../../components/TestStatusIcon';
import useTreeItemState from '../../../hooks/useTreeItemState';
import { formatRunTime } from '../../../utils/format';
import {
  getGroupStatus,
  getGroupTime,
  getPackageStatus,
  getPackageTime,
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
} from '../utils/historyTreeUtils';

interface TreeState {
  runId: string;
  filter: TestTreeFilter;
  sortBy: SortBy;
  openState: GenericMap<boolean>;
  forceOpen: boolean;
  defaultOpen: boolean;
  onToggleOpen: (key: string, isOpen: boolean) => void;
  onSelectTest: (testId: TestId, runId: string) => void;
  onOpenTestResult: (testId: TestId, runId: string) => void;
}

interface Props {
  currentRun: TestRunTree | null;
  olderRuns: Array<TestRunTree>;
  filter: TestTreeFilter;
  sortBy: SortBy;
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
  time?: number;
  defaultOpen?: boolean;
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
  time?: number;
  action?: React.ReactNode;
  onClick?: (event: React.MouseEvent) => void;
}

const getOlderRunClassName = (status: TestJobStatus): string =>
  status === 'running' || status === 'waiting'
    ? 'codicon-question text-[var(--vscode-descriptionForeground)]'
    : mapJobStatusToClassName(status);

const HistoryTree: React.FC<Props> = ({ currentRun, olderRuns, filter, sortBy, openState, forceOpen, onToggleOpen, onSelectTest, onOpenTestResult }) => {
  const getTreeState = (runId: string, defaultOpen: boolean): TreeState => ({
    runId, filter, sortBy, openState, forceOpen, defaultOpen, onToggleOpen, onSelectTest, onOpenTestResult,
  });

  return (
    <VscodeTree>
      {currentRun !== null && (
        <HistoryFolder nodeKey="current" label="Current testrun" defaultOpen openState={openState} forceOpen={forceOpen} onToggleOpen={onToggleOpen}>
          <HistoryRun run={currentRun} tree={getTreeState(currentRun.runId, true)} />
        </HistoryFolder>
      )}
      {olderRuns.length > 0 && (
        <HistoryFolder nodeKey="older" label={`${olderRuns.length} older results`} defaultOpen openState={openState} forceOpen={forceOpen} onToggleOpen={onToggleOpen}>
          {olderRuns.map(run => (
            <HistoryFolder
              key={run.runId}
              nodeKey={run.runId}
              icon={<StatusIcon className={`shrink-0 ${getOlderRunClassName(run.status)}`} />}
              label={`Test Run at ${new Date(run.startedOn).toLocaleString()}`}
              openState={openState}
              forceOpen={forceOpen}
              onToggleOpen={onToggleOpen}
            >
              <HistoryRun run={run} tree={getTreeState(run.runId, false)} />
            </HistoryFolder>
          ))}
        </HistoryFolder>
      )}
    </VscodeTree>
  );
};

const HistoryFolder: React.FC<FolderProps> = ({ nodeKey, label, description, icon, time, defaultOpen = false, openState, forceOpen, onToggleOpen, children }) => {
  const handleToggleCollapsed = (isCollapsed: boolean) => {
    onToggleOpen(nodeKey, !isCollapsed);
  };
  const treeItemRef = useTreeItemState({ onToggleCollapsed: handleToggleCollapsed });

  return (
    <VscodeTreeItem ref={treeItemRef} open={forceOpen || (openState[nodeKey] ?? defaultOpen)}>
      <HistoryLabel label={label} description={description} icon={icon} time={time} />
      {children}
    </VscodeTreeItem>
  );
};

const NeverRunIcon: React.FC = () => (
  <StatusIcon className="shrink-0 codicon-question text-[var(--vscode-descriptionForeground)]" />
);

const HistoryRun: React.FC<RunProps> = ({ run, tree }) => (
  <>
    {getVisiblePackages(run.testTree, tree.filter, tree.sortBy).map(testPackage => (
      <HistoryPackage key={testPackage.id.join(':')} testPackage={testPackage} tree={tree} />
    ))}
  </>
);

const HistoryPackage: React.FC<PackageProps> = ({ testPackage, tree }) => {
  const time = getPackageTime(testPackage);

  return (
    <HistoryFolder
      nodeKey={`${tree.runId}:${testPackage.id.join(':')}`}
      icon={isPackageNeverRun(testPackage) ? <NeverRunIcon /> : <TestStatusIcon status={getPackageStatus(testPackage)} />}
      label={testPackage.name}
      time={time > 0 ? time : undefined}
      defaultOpen={tree.defaultOpen}
      openState={tree.openState}
      forceOpen={tree.forceOpen}
      onToggleOpen={tree.onToggleOpen}
    >
      {getVisibleSuites(testPackage, tree.filter, tree.sortBy).map(suite => (
        <HistorySuite key={suite.name} suite={suite} tree={tree} />
      ))}
    </HistoryFolder>
  );
};

const HistorySuite: React.FC<SuiteProps> = ({ suite, tree }) => {
  const suiteKey = `${tree.runId}:${suite.id.join(':')}`;

  return (
    <HistoryFolder
      nodeKey={suiteKey}
      icon={isSuiteNeverRun(suite)
        ? <NeverRunIcon />
        : <TestStatusIcon status={{ status: suite.status, isWaiting: suite.isWaiting, isBuilding: suite.isBuilding, isRunning: suite.isRunning }} />}
      label={suite.name}
      time={suite.time !== undefined && suite.time > 0 ? suite.time : undefined}
      defaultOpen={tree.defaultOpen}
      openState={tree.openState}
      forceOpen={tree.forceOpen}
      onToggleOpen={tree.onToggleOpen}
    >
      {getVisibleNodes(suite.tests, tree.filter, tree.sortBy).map(node => (
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
  const time = getGroupTime(node);
  const isThreatModel = isThreatModelsGroup(node.name);

  return (
    <HistoryFolder
      nodeKey={`${suiteKey}:${groupPath.join(':')}`}
      icon={isGroupNeverRun(node) ? <NeverRunIcon /> : <TestStatusIcon status={status} isThreatModel={isThreatModel} />}
      label={node.name}
      description={isThreatModel ? `(${Object.keys(node.nodes).length})` : undefined}
      time={time > 0 && !status.isRunning && !status.isWaiting ? time : undefined}
      defaultOpen={tree.defaultOpen}
      openState={tree.openState}
      forceOpen={tree.forceOpen}
      onToggleOpen={tree.onToggleOpen}
    >
      {getVisibleNodes(node.nodes, tree.filter, tree.sortBy).map(child => (
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
        time={test.time}
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

const HistoryLabel: React.FC<LabelProps> = ({ icon, label, description, time, action, onClick }) => (
  <span onClickCapture={onClick} className="flex flex-row w-full items-center gap-1.5 cursor-pointer min-w-0">
    {icon}
    <span className="shrink-0 text-[var(--vscode-foreground)] text-[13px]">{label}</span>
    {description !== undefined && (
      <span className="flex-1 min-w-0 overflow-hidden whitespace-nowrap text-ellipsis text-[var(--vscode-descriptionForeground)] text-[11px]">
        {description}
      </span>
    )}
    {(time !== undefined || action) && (
      <span className="shrink-0 ml-auto flex flex-row items-center">
        {time !== undefined && (
          <span className="pr-2 text-[var(--vscode-descriptionForeground)] text-[11px]">{formatRunTime(time)}</span>
        )}
        {action}
      </span>
    )}
  </span>
);

export default HistoryTree;
