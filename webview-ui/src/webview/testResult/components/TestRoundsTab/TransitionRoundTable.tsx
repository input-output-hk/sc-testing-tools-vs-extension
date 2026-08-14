import {
  VscodeTabs,
  VscodeTabHeader,
  VscodeTabPanel
} from '@vscode-elements/react-elements';

import GenericTable from './GenericTable';

interface Props {
  round: TransitionTestRound;
}

const txValueToString = (value: TxValue): string => {
  const parts: string[] = [];
  if (value.lovelace > 0) {
    parts.push(`${value.lovelace} lovelace`);
  }
  for (const asset of value.assets) {
    parts.push(`${asset.quantity} ${asset.name}`);
  }
  return parts.join(', ');
};

const TxTitle: React.FC<{ txId?: string, index: number }> = ({ txId, index }) => (
  <h3 className="mb-3 text-base-10 font-bold">
    {`Transaction ${index + 1}`}
    {txId &&
      <span className="ml-3 pl-3 border-l border-l-base-14 text-blue-05 cursor-pointer">
        {`#${txId}`}
      </span>
    }
  </h3>
);

const TransitionRoundTable: React.FC<Props> = ({ round }) => (
  <div className="relative z-1">
    <VscodeTabs className="px-3 pt-1 bg-base-20">
      <VscodeTabHeader slot="header">Inputs</VscodeTabHeader>
      <VscodeTabHeader slot="header">Outputs</VscodeTabHeader>
      <VscodeTabHeader slot="header">Mints</VscodeTabHeader>

      <VscodeTabPanel className="mt-3">
        {round.transitions.filter(transition => transition.tx).map((transition, index) => (
          <div key={index} className="p-3 mb-3 bg-base-19">
            <TxTitle txId={transition.tx?.id} index={index} />
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
      </VscodeTabPanel>

      <VscodeTabPanel className="mt-3">
        {round.transitions.filter(transition => transition.tx).map((transition, index) => (
          <div key={index} className="p-3 mb-3 bg-base-19">
            <TxTitle txId={transition.tx?.id} index={index} />
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
      </VscodeTabPanel>

      <VscodeTabPanel className="mt-3">
        {round.transitions.filter(transition => transition.tx).map((transition, index) => (
          <div key={index} className="p-3 mb-3 bg-base-19">
            <TxTitle txId={transition.tx?.id} index={index} />
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
      </VscodeTabPanel>
    </VscodeTabs>
  </div>
);

export default TransitionRoundTable;