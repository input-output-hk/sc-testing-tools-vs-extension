interface Props {
  stepIndex: number;
  round: ThreatModelTestRound;
  snapshot: GraphSnapshot;
  onSelectStep: (index: number) => void;
  onSelectSnapshot: (snapshot: GraphSnapshot) => void;
}

const GraphTimeline: React.FC<Props> = ({ stepIndex, round, snapshot, onSelectStep, onSelectSnapshot }) => {
  const trace = round.traces[stepIndex];
  const selectedSnapshot = trace?.modifiedTx ? snapshot : 'original';
  const validation = trace?.validation;
  return (
    <div className="p-2 flex flex-col gap-2 bg-[var(--vscode-sideBar-background)] text-[var(--vscode-foreground)]">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={!trace || stepIndex === 0} onClick={() => onSelectStep(stepIndex - 1)}
          className="cursor-pointer disabled:opacity-40">Prev</button>
        <label className="text-xs">Attempt{' '}
          <select aria-label="Attack attempt" value={stepIndex} disabled={!trace}
            className="bg-[var(--vscode-dropdown-background)] text-[var(--vscode-dropdown-foreground)]"
            onChange={event => onSelectStep(Number(event.target.value))}>
            {round.traces.map((_, index) => <option key={index} value={index}>{index + 1} / {round.traces.length}</option>)}
          </select>
        </label>
        <button type="button" disabled={!trace || stepIndex >= round.traces.length - 1}
          onClick={() => onSelectStep(stepIndex + 1)} className="cursor-pointer disabled:opacity-40">Next</button>
        <div role="group" aria-label="Transaction snapshot" className="flex gap-2 text-xs">
          {(['original', 'modified'] as const).map(value => <button key={value} type="button"
            aria-pressed={selectedSnapshot === value} disabled={value === 'modified' && !trace?.modifiedTx}
            className={`px-2 py-1 border rounded cursor-pointer disabled:opacity-40 ${selectedSnapshot === value ? 'font-bold underline' : ''}`}
            onClick={() => onSelectSnapshot(value)}>{value === 'original' ? 'Original' : 'After attack (candidate)'}</button>)}
        </div>
      </div>
      {trace && <div className="text-xs" role="status">
        <span>Property: {trace.outcome.status} ({trace.category})</span>
        {!trace.modifiedTx && <span> · Modified transaction unavailable</span>}
        <span> · Candidate validation: {validation?.status ?? 'unknown'}</span>
        {'reason' in trace.outcome && <p>{trace.outcome.reason}</p>}
        {'message' in trace.outcome && <p>{trace.outcome.message}</p>}
        {validation && 'errors' in validation && validation.errors.map((error, i) => <p key={i}>{error}</p>)}
        {validation && 'reason' in validation && <p>{validation.reason}</p>}
      </div>}
      {trace && trace.modifications.length > 0 && <details className="text-xs">
        <summary className="cursor-pointer">Declared modifications ({trace.modifications.length})</summary>
        <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-all">{JSON.stringify(trace.modifications, null, 2)}</pre>
      </details>}
      {selectedSnapshot === 'modified' && <p className="text-xs opacity-80">Outputs show the candidate snapshot; correspondence with original outputs is unavailable.</p>}
      {!trace && <p className="text-xs">No attack attempts available</p>}
    </div>
  );
};
export default GraphTimeline;
