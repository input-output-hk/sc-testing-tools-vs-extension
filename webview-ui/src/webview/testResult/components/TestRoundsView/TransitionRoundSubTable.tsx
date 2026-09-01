import { useState } from 'react';

import Tabs from '../Tabs';
import type { TabItem } from '../Tabs';
import GenericTable from './GenericTable';

import { txValueToString } from '../../utils/txUtils';

interface Props {
  round: TransitionTestRound;
  onOpenGraph: (round: TestRound, nodeId?: string) => void;
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

const TransitionRoundSubTable: React.FC<Props> = ({ round, onOpenGraph }) => {
  const [selectedTab, setSelectedTab] = useState<string>('inputs');
  const transactions = round.transitions.filter(transition => transition.tx);
  const hasMintTransaction = transactions.some(transition => (transition.tx?.mint?.assets.length ?? 0) > 0);
  const effectiveSelectedTab = selectedTab === 'mints' && !hasMintTransaction ? 'inputs' : selectedTab;

  const tabs: Array<TabItem> = [
    {
      id: 'inputs',
      label: 'Inputs',
      panel: (
        <div>
          {transactions.map((transition, index) => (
            <div key={index} className="p-3 mb-3 bg-base-19">
              <TxTitle
                index={index}
                txId={transition.tx?.id}
                onClickTxId={() => onOpenGraph(round, `tx-${transition.tx?.id}`)}
              />
              <GenericTable
                columns={[
                  { key: 'utxo', label: 'UTxO', clickable: true },
                  { key: 'address', label: 'Address' },
                  { key: 'amount', label: 'Amount' },
                  { key: 'redeemer', label: 'Redeemer' }
                ]}
                rows={transition.tx?.inputs.map(input => ({
                  utxo: input.utxo,
                  address: input.address,
                  amount: txValueToString(input.value),
                  redeemer: input.redeemerRaw || ''
                })) ?? []}
                onClick={(index) => onOpenGraph(round, `utxo-${transition.tx?.inputs[index].utxo}`)}
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
          {transactions.map((transition, index) => (
            <div key={index} className="p-3 mb-3 bg-base-19">
              <TxTitle
                index={index}
                txId={transition.tx?.id}
                onClickTxId={() => onOpenGraph(round, `tx-${transition.tx?.id}`)}
              />
              <GenericTable
                columns={[
                  { key: 'index', label: '#' },
                  { key: 'utxo', label: 'UTxO', clickable: true },
                  { key: 'address', label: 'Address' },
                  { key: 'amount', label: 'Amount' },
                  { key: 'datum', label: 'Datum' }
                ]}
                rows={transition.tx?.outputs.map(output => ({
                  index: output.index,
                  utxo: output.utxo,
                  address: output.address,
                  amount: txValueToString(output.value),
                  datum: output.datum || ''
                })) ?? []}
                onClick={(index) => onOpenGraph(round, `utxo-${transition.tx?.outputs[index].utxo}`)}
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
          {transactions.map((transition, index) => (
            <div key={index} className="p-3 mb-3 bg-base-19">
              <TxTitle
                index={index}
                txId={transition.tx?.id}
                onClickTxId={() => onOpenGraph(round, `tx-${transition.tx?.id}`)}
              />
              <GenericTable
                columns={[
                  { key: 'quantity', label: 'Quantity' },
                  { key: 'name', label: 'Name' },
                  { key: 'policyId', label: 'Policy ID' }
                ]}
                rows={transition.tx?.mint?.assets.map(mint => ({
                  quantity: mint.quantity,
                  name: mint.name,
                  policyId: mint.policyId
                })) ?? []}
              />
            </div>
          ))}
        </div>
      ),
    });
  }

  return (
    <div className="relative z-1">
      <Tabs className="px-3 pt-1 bg-base-20"
        panelClassName="mt-3"
        selectedId={effectiveSelectedTab}
        onSelect={setSelectedTab}
        tabs={tabs}
      />
    </div>
  );
};

export default TransitionRoundSubTable;