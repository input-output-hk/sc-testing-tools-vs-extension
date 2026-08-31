import { useState } from 'react';

import Tabs from '../Tabs';
import GenericTable from './GenericTable';

import { txValueToString } from '../../utils/txUtils';

interface Props {
  round: ThreatModelTestRound;
  onOpenGraph: (round: TestRound, txId?: string, txType?: TxType) => void;
}

const INPUTS_TAB = 'inputs';
const OUTPUTS_TAB = 'outputs';
const MINTS_TAB = 'mints';

interface TableProps {
  index: number;
  tx: Tx;
  txType: TxType;
  onClickTxId: () => void;
}

interface TxTitleProps {
  index: number;
  txId?: string;
  txType: TxType;
  onClickTxId: () => void;
}

const TxTitle: React.FC<TxTitleProps> = ({ index, txId, txType, onClickTxId }) => (
  <h3 className="mb-3 text-base-10 font-bold">
    {`Transaction ${index + 1}${txType === 'original' ? '' : ' (Modified)'}`}
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

const InputTable: React.FC<TableProps> = ({ index, tx, txType, onClickTxId }) => (
  <div className="p-2 mb-3 bg-base-19">
    <TxTitle
      index={index}
      txId={tx.id}
      txType={txType}
      onClickTxId={onClickTxId}
    />
    <GenericTable
      columns={[
        { key: 'utxo', label: 'UTxO' },
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
    />
  </div>
);

const OutputTable: React.FC<TableProps> = ({ index, tx, txType, onClickTxId }) => (
  <div className="p-2 mb-3 bg-base-19">
    <TxTitle
      index={index}
      txId={tx.id}
      txType={txType}
      onClickTxId={onClickTxId}
    />
    <GenericTable
      columns={[
        { key: 'utxo', label: 'UTxO' },
        { key: 'address', label: 'Address' },
        { key: 'amount', label: 'Amount' },
        { key: 'datum', label: 'Datum' }
      ]}
      rows={tx.outputs.map(output => ({
        utxo: output.utxo,
        address: output.address,
        amount: txValueToString(output.value),
        datum: output.datum || ''
      })) ?? []}
    />
  </div>
);

const MintTable: React.FC<TableProps> = ({ index, tx, txType, onClickTxId }) => (
  <div className="p-2 mb-3 bg-base-19">
    <TxTitle
      index={index}
      txId={tx.id}
      txType={txType}
      onClickTxId={onClickTxId}
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

const ThreatModelRoundTable: React.FC<Props> = ({ round, onOpenGraph }) => {
  const [selectedTab, setSelectedTab] = useState<string>(INPUTS_TAB);
  const traces = round.traces.filter(trace => trace.tx);

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
                {traces.map((trace, index) => (
                  <div key={index}>
                    <InputTable
                      index={index}
                      tx={trace.tx}
                      txType="original"
                      onClickTxId={() => onOpenGraph(round, trace.tx.id, "original")}
                    />
                    {trace.modifiedTx &&
                      <InputTable
                        index={index}
                        tx={trace.modifiedTx}
                        txType="modified"
                        onClickTxId={() => onOpenGraph(round, trace.modifiedTx?.id, "modified")}
                      />
                    }
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
                {traces.map((trace, index) => (
                  <div key={index}>
                    <OutputTable
                      index={index}
                      tx={trace.tx}
                      txType="original"
                      onClickTxId={() => onOpenGraph(round, trace.tx.id, "original")}
                    />
                    {trace.modifiedTx &&
                      <OutputTable
                        index={index}
                        tx={trace.modifiedTx}
                        txType="modified"
                        onClickTxId={() => onOpenGraph(round, trace.modifiedTx?.id, "modified")}
                      />
                    }
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
                {traces.map((trace, index) => (
                  <div key={index}>
                    <MintTable
                      index={index}
                      tx={trace.tx}
                      txType="original"
                      onClickTxId={() => onOpenGraph(round, trace.tx.id, "original")}
                    />
                    {trace.modifiedTx &&
                      <MintTable
                        index={index}
                        tx={trace.modifiedTx}
                        txType="modified"
                        onClickTxId={() => onOpenGraph(round, trace.modifiedTx?.id, "modified")}
                      />
                    }
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

export default ThreatModelRoundTable;