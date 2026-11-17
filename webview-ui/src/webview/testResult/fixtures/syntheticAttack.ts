// Controlled data for regression tests and the local demo. Not a DQuadrant trace.
export const createSyntheticAttackRound = (): ThreatModelTestRound => {
  const input = (utxo: string, addressType: TxAddressType, addressLabel?: string): TxInput => ({
    utxo, addressType, addressLabel, address: `address-${utxo}`,
    value: { lovelace: 100, assets: [] },
  });
  const output = (id: string, index: number): TxOutput => ({
    ...input(`${id}#${index}`, 'public-key', `Output ${index}`), index,
  });
  const tx: Tx = {
    id: 'synthetic-original', fee: 10, signers: ['signer-a', 'signer-b'],
    inputs: [input('script#0', 'script', 'Synthetic script'), input('wallet#0', 'public-key', 'Synthetic wallet')],
    outputs: [0, 1, 2].map(i => output('synthetic-original', i)), withdrawals: [],
  };
  const modifiedTx: Tx = {
    ...tx, id: 'synthetic-candidate', fee: 20, signers: ['signer-b'],
    inputs: [input('added#0', 'script'), ...tx.inputs],
    outputs: [0, 1, 2, 3].map(i => output('synthetic-candidate', i)),
  };
  return {
    id: 0, testId: ['synthetic', 'demo', 'controlled-fixture', '2'], type: 'threat-model', status: 'failure',
    traces: [{ tx, modifiedTx, modifications: [], targetTxIndex: 0, category: 'claimed',
      outcome: { status: 'failed', reason: 'Synthetic example: the candidate validated.' }, validation: { status: 'valid' } }],
  };
};
