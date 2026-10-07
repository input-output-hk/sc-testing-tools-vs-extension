import { VscodeTree, VscodeTreeItem } from '@vscode-elements/react-elements';

import StatusIcon from '../../../components/StatusIcon';
import TestStatusIcon from '../../../components/TestStatusIcon';
import useTreeItemState from '../../../hooks/useTreeItemState';
import { formatRunTime } from '../../../utils/format';
import { mapJobStatusToClassName } from '../../testTree/utils/treeUtils';
import type { HistoryNode, HistoryRunNode, HistoryTestNode, HistoryThreatModelsNode } from '../utils/historyTreeUtils';

interface Props {
  currentRun: HistoryRunNode | null;
  olderRuns: Array<HistoryRunNode>;
  openState: GenericMap<boolean>;
  forceOpen: boolean;
  onToggleOpen: (key: string, isOpen: boolean) => void;
  onSelectTest: (node: HistoryTestNode) => void;
}

interface FolderProps {
  nodeKey: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  openState: GenericMap<boolean>;
  forceOpen: boolean;
  onToggleOpen: (key: string, isOpen: boolean) => void;
  children: React.ReactNode;
}

interface NodesProps {
  nodes: Array<HistoryNode>;
  openState: GenericMap<boolean>;
  forceOpen: boolean;
  onToggleOpen: (key: string, isOpen: boolean) => void;
  onSelectTest: (node: HistoryTestNode) => void;
}

interface ThreatModelsProps {
  node: HistoryThreatModelsNode;
  openState: GenericMap<boolean>;
  forceOpen: boolean;
  onToggleOpen: (key: string, isOpen: boolean) => void;
  onSelectTest: (node: HistoryTestNode) => void;
}

interface TestProps {
  node: HistoryTestNode;
  showDescription?: boolean;
  onSelectTest: (node: HistoryTestNode) => void;
}

interface LabelProps {
  label: string;
  description?: string;
  icon?: React.ReactNode;
  time?: number;
  onClick?: () => void;
}

const HistoryTree: React.FC<Props> = ({ currentRun, olderRuns, openState, forceOpen, onToggleOpen, onSelectTest }) => (
  <VscodeTree>
    {currentRun !== null && (
      <HistoryFolder nodeKey="current" label="Current testrun" defaultOpen openState={openState} forceOpen={forceOpen} onToggleOpen={onToggleOpen}>
        <HistoryNodes nodes={currentRun.nodes} openState={openState} forceOpen={forceOpen} onToggleOpen={onToggleOpen} onSelectTest={onSelectTest} />
      </HistoryFolder>
    )}
    {olderRuns.length > 0 && (
      <HistoryFolder nodeKey="older" label={`${olderRuns.length} older results`} defaultOpen openState={openState} forceOpen={forceOpen} onToggleOpen={onToggleOpen}>
        {olderRuns.map(run => (
          <HistoryFolder
            key={run.runId}
            nodeKey={run.runId}
            icon={<StatusIcon className={`shrink-0 ${mapJobStatusToClassName(run.status)}`} animated={run.status === 'running'} />}
            label={`Test Run at ${new Date(run.startedOn).toLocaleString()}`}
            openState={openState}
            forceOpen={forceOpen}
            onToggleOpen={onToggleOpen}
          >
            <HistoryNodes nodes={run.nodes} openState={openState} forceOpen={forceOpen} onToggleOpen={onToggleOpen} onSelectTest={onSelectTest} />
          </HistoryFolder>
        ))}
      </HistoryFolder>
    )}
  </VscodeTree>
);

const HistoryFolder: React.FC<FolderProps> = ({ nodeKey, label, description, icon, defaultOpen = false, openState, forceOpen, onToggleOpen, children }) => {
  const handleToggleCollapsed = (isCollapsed: boolean) => {
    onToggleOpen(nodeKey, !isCollapsed);
  };
  const treeItemRef = useTreeItemState({ onToggleCollapsed: handleToggleCollapsed });

  return (
    <VscodeTreeItem ref={treeItemRef} open={forceOpen || (openState[nodeKey] ?? defaultOpen)}>
      <HistoryLabel label={label} description={description} icon={icon} />
      {children}
    </VscodeTreeItem>
  );
};

const HistoryNodes: React.FC<NodesProps> = ({ nodes, openState, forceOpen, onToggleOpen, onSelectTest }) => (
  <>
    {nodes.map(node => node.type === 'test'
      ? <HistoryTest key={node.key} node={node} showDescription onSelectTest={onSelectTest} />
      : <HistoryThreatModels key={node.key} node={node} openState={openState} forceOpen={forceOpen} onToggleOpen={onToggleOpen} onSelectTest={onSelectTest} />
    )}
  </>
);

const HistoryThreatModels: React.FC<ThreatModelsProps> = ({ node, openState, forceOpen, onToggleOpen, onSelectTest }) => (
  <HistoryFolder
    nodeKey={node.key}
    icon={<TestStatusIcon status={node.status} isThreatModel />}
    label="Threat Models"
    description={`${node.tests.length} Threat Models @ ${node.description}`}
    openState={openState}
    forceOpen={forceOpen}
    onToggleOpen={onToggleOpen}
  >
    {node.tests.map(test => <HistoryTest key={test.key} node={test} onSelectTest={onSelectTest} />)}
  </HistoryFolder>
);

const HistoryTest: React.FC<TestProps> = ({ node, showDescription = false, onSelectTest }) => {
  const handleClick = () => {
    onSelectTest(node);
  };

  return (
    <VscodeTreeItem>
      <HistoryLabel
        icon={<TestStatusIcon status={node.status} isThreatModel={node.test.type === 'threat-model'} />}
        label={node.name}
        description={showDescription ? node.description : undefined}
        time={node.test.time}
        onClick={handleClick}
      />
    </VscodeTreeItem>
  );
};

const HistoryLabel: React.FC<LabelProps> = ({ icon, label, description, time, onClick }) => (
  <span onClickCapture={onClick} className="flex flex-row w-full items-center gap-1.5 cursor-pointer min-w-0">
    {icon}
    <span className="shrink-0 text-[var(--vscode-foreground)] text-[13px]">{label}</span>
    {description !== undefined && (
      <span className="flex-1 min-w-0 overflow-hidden whitespace-nowrap text-ellipsis text-[var(--vscode-descriptionForeground)] text-[11px]">
        {description}
      </span>
    )}
    {time !== undefined && (
      <span className="shrink-0 ml-auto pr-2 text-[var(--vscode-descriptionForeground)] text-[11px]">{formatRunTime(time)}</span>
    )}
  </span>
);

export default HistoryTree;
