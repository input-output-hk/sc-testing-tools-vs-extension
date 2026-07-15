import { Fragment, useEffect, useRef, useState } from 'react';
import {
  VscodeTextfield,
  VscodeToolbarButton,
} from '@vscode-elements/react-elements';

import RowDetailsTable from '../../../components/RowDetailsTable';
import { rowDetailsColumns, rowDetailsRows } from '../../../components/RowDetailsTable/tableMockData';
import SortMenu, { type SortOption } from '../../../components/SortMenu';
import ToggleSwitch from '../../../components/ToggleSwitch';

const rowDetailsRowsWithLinks: React.ReactNode[][] = rowDetailsRows.map(
  (row: string[]) => [
    <span className="text-blue-05 underline">{row[0]}</span>,
    ...row.slice(1),
  ],
);

interface Props {
  testResult: TestResult;
  onOpenDetail?: (txHash: string) => void;
}

const TestCounterexampleTab: React.FC<Props> = ({ testResult, onOpenDetail }) => {
  const [searchText, setSearchText] = useState('');
  const [showDiscarded, setShowDiscarded] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('alphabetical');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const sortButtonRef = useRef<HTMLDivElement>(null);
  const [, forceUpdate] = useState(0);

  const handleToggleRowExpand = (e: React.MouseEvent<HTMLElement>) => {
    const txHash = e.currentTarget.dataset.txHash;
    if (!txHash) return;
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(txHash)) next.delete(txHash);
      else next.add(txHash);
      return next;
    });
  };

  useEffect(() => {
    const onResize = () => forceUpdate((n) => n + 1);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const txIds = testResult.graph?.txs.map((tx) => tx.hash) || [];
  const steps = testResult.counterexampleSteps || [];
  const discardedCount = steps.filter((s) => s.discarded).length;
  const visibleTxs = showDiscarded ? steps : steps.filter((s) => !s.discarded);

  const allVarNames = Array.from(
    new Set(steps.flatMap((s) => Object.keys(s.data))),
  );

  const displayVariables = allVarNames
    .filter(
      (k) => searchText === '' || k.toLowerCase().includes(searchText.toLowerCase()),
    )
    .sort((a, b) => {
      if (sortBy === 'alphabetical') return a.localeCompare(b);
      return 0;
    });

  const columns = [
    { id: 'txHash', label: 'Tx Hash', align: 'left' as const },
    ...displayVariables.map((v) => ({
      id: v,
      label: v,
      align: 'center' as const,
    })),
  ];

  const rows = visibleTxs.map((tx) => [
    tx.txHash,
    ...displayVariables.map((v) => String(tx.data[v] ?? '-')),
  ]);

  return (
    <div className="flex flex-col overflow-hidden flex-1 m-4">
      {/* Search & filter bar */}
      <div className="flex items-center justify-between px-4 py-2 shrink-0 bg-base-17">
        <VscodeTextfield
          placeholder="Search variable..."
          value={searchText}
          onInput={(e: Event) =>
            setSearchText((e.target as HTMLInputElement).value)
          }
        >
          <i
            slot="content-after"
            className="codicon codicon-clear-all cursor-pointer opacity-70 hover:opacity-100 mr-1"
            onClick={() => setSearchText('')}
          />
          <i
            slot="content-after"
            className="codicon codicon-filter cursor-pointer opacity-70 hover:opacity-100 mr-1"
          />
        </VscodeTextfield>

        <div className="flex items-center gap-8">
          <ToggleSwitch
            checked={showDiscarded}
            onChange={setShowDiscarded}
            label="Show discarded"
            badgeCount={discardedCount}
          />
          <div className="flex items-center gap-2">
            <div className="relative" ref={sortButtonRef}>
              <VscodeToolbarButton
                title="Sort"
                style={{ transform: 'rotate(90deg)' }}
                onClick={() => setSortMenuOpen((o) => !o)}
              >
                <i className="codicon codicon-arrow-swap" />
              </VscodeToolbarButton>
              {sortMenuOpen && (
                <SortMenu
                  value={sortBy}
                  onChange={setSortBy}
                  onClose={() => setSortMenuOpen(false)}
                  anchorRef={sortButtonRef}
                />
              )}
            </div>
            <VscodeToolbarButton title="Filter">
              <i className="codicon codicon-filter" />
            </VscodeToolbarButton>
          </div>
        </div>
      </div>

      {testResult.test.status === 'running' ? (
        <div className="flex flex-col flex-1 items-center justify-center gap-2 text-blue-06">
          <i className="codicon codicon-loading codicon-modifier-spin text-2xl" />
          <span className="text-xs">Running…</span>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse table-fixed">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.id}
                    className={`h-8 px-4 border border-base-13 bg-base-20 text-xs font-bold text-base-05 ${col.align === 'left' ? 'text-left' : 'text-center'}`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIdx) => {
                const txHash = String(row[0]);
                const isKnownTx = txIds.includes(txHash);
                const isExpanded = expandedRows.has(txHash);
                return (
                  <Fragment key={rowIdx}>
                    <tr className={rowIdx % 2 === 0 ? 'bg-base-19' : 'bg-base-20'}>
                      {columns.map((col, colIdx) => (
                        <td
                          key={col.id}
                          className={`h-9 px-2 border border-base-13 text-xs text-base-06 truncate ${col.align === 'left' ? 'text-left pl-2 pr-4' : 'text-center px-4'}`}
                        >
                          {col.id === 'txHash' && isKnownTx ? (
                            <span className="inline-flex items-center gap-1">
                              <i
                                className={`codicon ${isExpanded ? 'codicon-chevron-down' : 'codicon-chevron-right'} opacity-40 cursor-pointer`}
                                data-tx-hash={txHash}
                                onClick={handleToggleRowExpand}
                              />
                              <span
                                className="cursor-pointer text-blue-06"
                                onClick={() => onOpenDetail?.(txHash)}
                              >
                                {row[colIdx]}
                              </span>
                            </span>
                          ) : (
                            (row[colIdx] ?? '-')
                          )}
                        </td>
                      ))}
                    </tr>
                    {isExpanded && (
                      <tr className={rowIdx % 2 === 0 ? 'bg-base-19' : 'bg-base-20'}>
                        <td colSpan={columns.length} className="p-2 py-4 border border-base-13">
                          <RowDetailsTable columns={rowDetailsColumns} rows={rowDetailsRowsWithLinks} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TestCounterexampleTab;
