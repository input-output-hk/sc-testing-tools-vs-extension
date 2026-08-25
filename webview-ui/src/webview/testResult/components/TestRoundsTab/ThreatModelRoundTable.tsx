import {
  VscodeTabs,
  VscodeTabHeader,
  VscodeTabPanel
} from '@vscode-elements/react-elements';

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

const InputTable: React.FC<TableProps> = ({ index, tx, onClickNode }) => (
  <div className="p-3 mb-3 bg-base-19">
    <TxTitle
      index={index}
      txId={tx.id}
      onClickTxId={() => onClickNode(`tx-${tx.id}`)}
    />
    <GenericTable
      columns={[
        { key: 'utxo', label: 'UTxO', clickeable: true },
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
        { key: 'utxo', label: 'UTxO', clickeable: true },
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

const ThreatModelRoundTable: React.FC<Props> = ({ round, onOpenGraph }) => (
  <div className="relative z-1">
    <VscodeTabs className="px-3 pt-1 bg-base-20">
      <VscodeTabHeader slot="header">Inputs</VscodeTabHeader>
      <VscodeTabHeader slot="header">Outputs</VscodeTabHeader>
      <VscodeTabHeader slot="header">Mints</VscodeTabHeader>

      <VscodeTabPanel className="mt-3">
        {round.traces.filter(trace => trace.tx).map((trace, index) => (
          <div key={index}>
            <InputTable
              index={index} tx={trace.tx}
              onClickNode={nodeId => onOpenGraph(round, nodeId)}
            />
          </div>
        ))}
      </VscodeTabPanel>

      <VscodeTabPanel className="mt-3">
        {round.traces.filter(trace => trace.tx).map((trace, index) => (
          <div key={index}>
            <OutputTable
              index={index} tx={trace.tx}
              onClickNode={nodeId => onOpenGraph(round, nodeId)}
            />
          </div>
        ))}
      </VscodeTabPanel>

      <VscodeTabPanel className="mt-3">
        {round.traces.filter(trace => trace.tx).map((trace, index) => (
          <div key={index}>
            <MintTable
              index={index} tx={trace.tx}
              onClickNode={nodeId => onOpenGraph(round, nodeId)}
            />
          </div>
        ))}
      </VscodeTabPanel>
    </VscodeTabs>
  </div>
);

export default ThreatModelRoundTable;