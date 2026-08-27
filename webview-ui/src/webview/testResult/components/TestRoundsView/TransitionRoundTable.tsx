import { useState } from 'react';

import Tabs from '../Tabs';
import GenericTable from './GenericTable';

import { txValueToString } from '../../utils/txUtils';

interface Props {
  round: TransitionTestRound;
  onOpenGraph: (round: TestRound, txId?: string, txType?: TxType) => void;
}

const INPUTS_TAB = 'inputs';
const OUTPUTS_TAB = 'outputs';
const MINTS_TAB = 'mints';

interface TxTitleProps {
  index: number;
  txId?: string;
  onClickTxId: () => void;
}

const TxTitle: React.FC<TxTitleProps> = ({ index, txId, onClickTxId }) => (
  <h3 className="mb-3 text-base-10 font-bold">
    {`Transaction ${index + 1}`}
    {txId &&
      <span
        onClick={onClickTxId}
        className="ml-3 pl-3 border-l border-l-base-14 text-blue-05 cursor-pointer"
      >
        {`#${txId}`}
      </span>
    }
  </h3>
);

const TransitionRoundTable: React.FC<Props> = ({ round, onOpenGraph }) => {
  const [selectedTab, setSelectedTab] = useState<string>(INPUTS_TAB);
  const transactions = round.transitions.filter(transition => transition.tx);

  return (
    <div className="relative z-1">
      <Tabs
        className="px-3 pt-1 bg-base-20"
        panelClassName="mt-3"
        selectedId={selectedTab}
        onSelect={setSelectedTab}
        tabs={[
          {
            id: INPUTS_TAB,
            label: 'Inputs',
            panel: (
              <>
                {transactions.map((transition, index) => (
                  <div key={index} className="p-3 mb-3 bg-base-19">
                    <TxTitle
                      index={index}
                      txId={transition.tx?.id}
                      onClickTxId={() => onOpenGraph(round, transition.tx?.id)}
                    />
                    <GenericTable
                      columns={[
                        { key: 'utxo', label: 'UTxO' },
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
                    />
                  </div>
                ))}
              </>
            ),
          },
          {
            id: OUTPUTS_TAB,
            label: 'Outputs',
            panel: (
              <>
                {transactions.map((transition, index) => (
                  <div key={index} className="p-3 mb-3 bg-base-19">
                    <TxTitle
                      index={index}
                      txId={transition.tx?.id}
                      onClickTxId={() => onOpenGraph(round, transition.tx?.id)}
                    />
                    <GenericTable
                      columns={[
                        { key: 'utxo', label: 'UTxO' },
                        { key: 'address', label: 'Address' },
                        { key: 'amount', label: 'Amount' },
                        { key: 'datum', label: 'Datum' }
                      ]}
                      rows={transition.tx?.outputs.map(output => ({
                        utxo: output.utxo,
                        address: output.address,
                        amount: txValueToString(output.value),
                        datum: output.datum || ''
                      })) ?? []}
                    />
                  </div>
                ))}
              </>
            ),
          },
          {
            id: MINTS_TAB,
            label: 'Mints',
            panel: (
              <>
                {transactions.map((transition, index) => (
                  <div key={index} className="p-3 mb-3 bg-base-19">
                    <TxTitle
                      index={index}
                      txId={transition.tx?.id}
                      onClickTxId={() => onOpenGraph(round, transition.tx?.id)}
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
              </>
            ),
          },
        ]}
      />
    </div>
  );
};

export default TransitionRoundTable;