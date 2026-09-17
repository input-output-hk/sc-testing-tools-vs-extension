const RunningIndicator: React.FC = () => (
  <div className="flex-1 flex flex-col items-center justify-center gap-2 text-blue-06">
    <i className="codicon codicon-loading codicon-modifier-spin text-3xl" />
    <span className="text-md">Running…</span>
  </div>
);

export default RunningIndicator;
