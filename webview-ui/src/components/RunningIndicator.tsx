const RunningIndicator: React.FC = () => (
  <div className="flex flex-col flex-1 items-center justify-center gap-2 text-blue-06">
    <i className="codicon codicon-loading codicon-modifier-spin text-2xl" />
    <span className="text-xs">Running…</span>
  </div>
);

export default RunningIndicator;
