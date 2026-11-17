import { expect, it } from 'vitest';
import { txValueToString } from './txUtils';
it('preserves explicit zero and negative lovelace values', () => {
  expect(txValueToString({ lovelace: 0, assets: [] })).toBe('0 lovelace');
  expect(txValueToString({ lovelace: -1, assets: [] })).toBe('-1 lovelace');
  expect(txValueToString(undefined)).toBeUndefined();
});
