import { useState } from 'react';

import Tabs from '../Tabs';
import { InputTable, OutputTable, MintTable, WithdrawalTable } from './SubTable';

import type { TabItem } from '../Tabs';

interface Props {
  round: ThreatModelTestRound;
  onOpenGraph: (round: TestRound, nodeId?: string) => void;
}

const ThreatModelRoundSubTable: React.FC<Props> = ({ round, onOpenGraph }) => {
  const [selectedTab, setSelectedTab] = useState<string>('inputs');
  const traces = round.traces.filter(trace => trace.tx);
  const hasMints = traces.some(trace => (trace.tx.mint?.assets.length ?? 0) > 0);
  const hasWithdrawals = traces.some(trace => trace.tx.withdrawals.length > 0);
  const effectiveSelectedTab =
    selectedTab === 'mints' && !hasMints ? 'inputs' :
    selectedTab === 'withdrawals' && !hasWithdrawals ? 'inputs' :
    selectedTab;

  const tabs: Array<TabItem> = [
    {
      id: 'inputs',
      label: 'Inputs',
      panel: (
        <div>
          {traces.map((trace, index) => (
            <div key={index}>
              <InputTable
                index={index} tx={trace.tx}
                tooltipId={`tx-graph-${round.id}-inputs-${index}`}
                onClickNode={nodeId => onOpenGraph(round, nodeId)}
              />
            </div>
          ))}
        </div>
      ),
    },
    {
      id: 'outputs',
      label: 'Outputs',
      panel: (
        <div>
          {traces.map((trace, index) => (
            <div key={index}>
              <OutputTable
                index={index} tx={trace.tx}
                tooltipId={`tx-graph-${round.id}-outputs-${index}`}
                onClickNode={nodeId => onOpenGraph(round, nodeId)}
              />
            </div>
          ))}
        </div>
      ),
    },
  ];

  if (hasMints) {
    tabs.push({
      id: 'mints',
      label: 'Mints',
      panel: (
        <div>
          {traces
            .filter(trace => trace.tx.mint)
            .map((trace, index) => (
              <div key={index}>
                <MintTable
                  index={index} tx={trace.tx}
                  tooltipId={`tx-graph-${round.id}-mints-${index}`}
                  onClickNode={nodeId => onOpenGraph(round, nodeId)}
                />
              </div>
            ))
          }
        </div>
      ),
    });
  }

  if (hasWithdrawals) {
    tabs.push({
      id: 'withdrawals',
      label: 'Withdrawals',
      panel: (
        <div>
          {traces
            .filter(trace => trace.tx.withdrawals.length > 0)
            .map((trace, index) => (
              <div key={index}>
                <WithdrawalTable
                  index={index} tx={trace.tx}
                  tooltipId={`tx-graph-${round.id}-withdrawals-${index}`}
                  onClickNode={nodeId => onOpenGraph(round, nodeId)}
                />
              </div>
            ))
          }
        </div>
      ),
    });
  }

  return (
    <div className="relative z-1">
      <Tabs
        className="px-3 pt-3 pb-1 bg-base-20"
        panelClassName="mt-3"
        selectedId={effectiveSelectedTab}
        onSelect={setSelectedTab}
        tabs={tabs}
      />
    </div>
  );
};

export default ThreatModelRoundSubTable;