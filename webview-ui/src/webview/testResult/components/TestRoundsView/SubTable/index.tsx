import GenericTable from './GenericTable';
import Tooltip from '../../../../../components/Tooltip';
import { txValueToString } from '../../../utils/txUtils';

interface TableProps {
  index: number;
  tx: Tx;
  tooltipId: string;
  onClickNode: (nodeId: string) => void;
}

interface TxTitleProps {
  index: number;
  txId?: string;
  tooltipId: string;
  onClickTxId: () => void;
}

const TxTitle: React.FC<TxTitleProps> = ({ index, txId, tooltipId, onClickTxId }) => (
  <h3 className="mb-3 text-base-10 font-bold">
    {`Transaction #${index + 1}`}
    {txId &&
      <>
        <span
          id={tooltipId}
          onClick={onClickTxId}
          className="ml-3 pl-3 border-l border-l-base-14 text-blue-05 cursor-pointer"
        >
          {txId}
        </span>
        <Tooltip
          content="View Graph"
          id={tooltipId}
          place="bottom-start"
          positionStrategy="fixed"
        />
      </>
    }
  </h3>
);

export const InputTable: React.FC<TableProps> = ({ index, tx, tooltipId, onClickNode }) => (
  <div className="p-3 mb-3 bg-base-19">
    <TxTitle
      index={index}
      txId={tx.id}
      tooltipId={tooltipId}
      onClickTxId={() => onClickNode(`tx-${tx.id}`)}
    />
    <GenericTable
      columns={[
        { key: 'utxo', label: 'UTxO', clickable: true },
        { key: 'label', label: 'Label' },
        { key: 'address', label: 'Address' },
        { key: 'amount', label: 'Amount' },
        { key: 'redeemer', label: 'Redeemer' }
      ]}
      rows={tx.inputs.map((input, inputIdx) => ({
        utxo: input.utxo,
        label: input.addressLabel ?? `UTxO #${inputIdx}`,
        address: input.address,
        amount: txValueToString(input.value),
        redeemer: input.redeemerRaw ?? ''
      })) ?? []}
      tooltip={{ content: 'View Graph', idPrefix: `${tooltipId}-cell` }}
      onClick={(index) => onClickNode(`utxo-${tx.inputs[index].utxo}`)}
    />
  </div>
);

export const OutputTable: React.FC<TableProps> = ({ index, tx, tooltipId, onClickNode }) => (
  <div className="p-3 mb-3 bg-base-19">
    <TxTitle
      index={index}
      txId={tx.id}
      tooltipId={tooltipId}
      onClickTxId={() => onClickNode(`tx-${tx.id}`)}
    />
    <GenericTable
      columns={[
        { key: 'utxo', label: 'UTxO', clickable: true },
        { key: 'label', label: 'Label' },
        { key: 'address', label: 'Address' },
        { key: 'amount', label: 'Amount' },
        { key: 'datum', label: 'Datum' }
      ]}
      rows={tx.outputs.map(output => ({
        utxo: output.utxo,
        label: output.addressLabel ?? `UTxO #${output.index}`,
        address: output.address,
        amount: txValueToString(output.value),
        datum: output.datum ?? ''
      })) ?? []}
      tooltip={{ content: 'View Graph', idPrefix: `${tooltipId}-cell` }}
      onClick={(index) => onClickNode(`utxo-${tx.outputs[index].utxo}`)}
    />
  </div>
);

export const MintTable: React.FC<TableProps> = ({ index, tx, tooltipId, onClickNode }) => (
  <div className="p-3 mb-3 bg-base-19">
    <TxTitle
      index={index}
      txId={tx.id}
      tooltipId={tooltipId}
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

export const WithdrawalTable: React.FC<TableProps> = ({ index, tx, tooltipId, onClickNode }) => (
  <div className="p-3 mb-3 bg-base-19">
    <TxTitle
      index={index}
      txId={tx.id}
      tooltipId={tooltipId}
      onClickTxId={() => onClickNode(`tx-${tx.id}`)}
    />
    <GenericTable
      columns={[
        { key: 'label', label: 'Label' },
        { key: 'stakeAddress', label: 'Stake Address' },
        { key: 'amount', label: 'Amount' },
        { key: 'redeemer', label: 'Redeemer' }
      ]}
      rows={tx.withdrawals.map(withdrawal => ({
        label: withdrawal.addressLabel ?? 'Withdrawal',
        stakeAddress: withdrawal.stakeAddress,
        amount: `${withdrawal.amount} lovelace`,
        redeemer: withdrawal.redeemerRaw ?? ''
      })) ?? []}
    />
  </div>
);