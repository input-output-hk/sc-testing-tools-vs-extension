import type { RowDetailsTableColumn } from "./index";

export const rowDetailsColumns: RowDetailsTableColumn[] = [
  { id: 'scripts', label: 'Scripts', align: 'left' },
  { id: 'datum', label: 'Datum' },
  { id: 'redeemer', label: 'Redeemer' },
  { id: 'execUnits', label: 'Exec. units' },
];

export const rowDetailsRows: string[][] = [
  ['# 0x3a...b2c4', 'reserveShen: ...', 'mkValidator', 'Lorem'],
  ['# s2er...1b6w', '-', 'mkValidator', 'Lorem'],
  ['# 8e5s...1b2c', 'reserveShen: ...', 'mkValidator', 'Lorem'],
  ['# 4s2c...1j9y', 'signee: us63...', 'mkValidator', 'Lorem'],
  ['# 8e5s...1b2c', 'signee: us63...', 'mkValidator', 'Lorem'],
];
