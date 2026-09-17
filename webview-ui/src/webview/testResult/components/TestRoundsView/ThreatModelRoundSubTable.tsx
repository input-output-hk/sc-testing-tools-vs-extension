import { useState } from 'react';

import Tabs from '../Tabs';
import type { TabItem } from '../Tabs';
import GenericTable from './GenericTable';

import { txValueToString } from '../../utils/txUtils';

interface Props {
  round: ThreatModelTestRound;
  onOpenGraph: (round: TestRound, nodeId?: string) => void;
}

interface TableProps {
  index: number;
  tx: Tx;
  onClickNode: (nodeId: string) => void;
}

interface TxTitleProps {
  index: number;
  txId?: string;
  onClickTxId: () => void;
}

const TxTitle: React.FC<TxTitleProps> = ({ index, txId, onClickTxId }) => (
  <h3 className="mb-3 text-base-10 font-bold">
    {`Transaction #${index + 1}`}
    {txId &&
      <span
        onClick={onClickTxId}
        className="ml-3 pl-3 border-l border-l-base-14 text-blue-05 cursor-pointer"
      >
        {txId}
      </span>
    }
  </h3>
);

const InputTable: React.FC<TableProps> = ({ index, tx, onClickNode }) => (
  <div className="p-3 mb-3 bg-base-19">
    <TxTitle
      index={index}
      txId={tx.id}
      onClickTxId={() => onClickNode(`tx-${tx.id}`)}
    />
    <GenericTable
      columns={[
        { key: 'utxo', label: 'UTxO', clickable: true },
        { key: 'address', label: 'Address' },
        { key: 'amount', label: 'Amount' },
        { key: 'redeemer', label: 'Redeemer' }
      ]}
      rows={tx.inputs.map(input => ({
        utxo: input.utxo,
        address: input.address,
        amount: txValueToString(input.value),
        redeemer: input.redeemerRaw || ''
      })) ?? []}
      onClick={(index) => onClickNode(`utxo-${tx.inputs[index].utxo}`)}
    />
  </div>
);

const OutputTable: React.FC<TableProps> = ({ index, tx, onClickNode }) => (
  <div className="p-3 mb-3 bg-base-19">
    <TxTitle
      index={index}
      txId={tx.id}
      onClickTxId={() => onClickNode(`tx-${tx.id}`)}
    />
    <GenericTable
      columns={[
        { key: 'index', label: '#' },
        { key: 'utxo', label: 'UTxO', clickable: true },
        { key: 'address', label: 'Address' },
        { key: 'amount', label: 'Amount' },
        { key: 'datum', label: 'Datum' }
      ]}
      rows={tx.outputs.map(output => ({
        index: output.index,
        utxo: output.utxo,
        address: output.address,
        amount: txValueToString(output.value),
        datum: output.datum || ''
      })) ?? []}
      onClick={(index) => onClickNode(`utxo-${tx.inputs[index].utxo}`)}
    />
  </div>
);

const MintTable: React.FC<TableProps> = ({ index, tx, onClickNode }) => (
  <div className="p-3 mb-3 bg-base-19">
    <TxTitle
      index={index}
      txId={tx.id}
      onClickTxId={() => onClickNode(`tx-${tx.id}`)}
    />
    <GenericTable
      columns={[
        { key: 'quantity', label: 'Quantity' },
        { key: 'name', label: 'Name' },
        { key: 'policyId', label: 'Policy ID' }
      ]}
      rows={tx.mint?.assets.map(mint => ({
        quantity: mint.quantity,
        name: mint.name,
        policyId: mint.policyId
      })) ?? []}
    />
  </div>
);

const ThreatModelRoundSubTable: React.FC<Props> = ({ round, onOpenGraph }) => {
  const [selectedTab, setSelectedTab] = useState<string>('inputs');
  const traces = round.traces.filter(trace => trace.tx);
  const hasMintTransaction = traces.some(trace => (trace.tx.mint?.assets.length ?? 0) > 0);
  const effectiveSelectedTab = selectedTab === 'mints' && !hasMintTransaction ? 'inputs' : selectedTab;

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
                onClickNode={nodeId => onOpenGraph(round, nodeId)}
              />
            </div>
          ))}
        </div>
      ),
    },
  ];

  if (hasMintTransaction) {
    tabs.push({
      id: 'mints',
      label: 'Mints',
      panel: (
        <div>
          {traces.map((trace, index) => (
            <div key={index}>
              <MintTable
                index={index} tx={trace.tx}
                onClickNode={nodeId => onOpenGraph(round, nodeId)}
              />
            </div>
          ))}
        </div>
      ),
    });
  }

  return (
    <div className="relative z-1">
      <Tabs
        className="px-3 pt-1 bg-base-20"
        panelClassName="mt-3"
        selectedId={effectiveSelectedTab}
        onSelect={setSelectedTab}
        tabs={tabs}
      />
    </div>
  );
};

export default ThreatModelRoundSubTable;