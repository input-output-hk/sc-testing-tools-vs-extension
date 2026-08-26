
export const txValueToString = (value: TxValue | undefined): string => {
  const parts: string[] = [];
  if (!value) return '';
  if (value.lovelace > 0) {
    parts.push(`${value.lovelace} lovelace`);
  }
  for (const asset of value.assets) {
    parts.push(`${asset.quantity} ${asset.name}`);
  }
  return parts.join(', ');
};