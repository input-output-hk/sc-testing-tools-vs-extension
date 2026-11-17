const icons: Record<GraphStatus, string> = {
  success: 'codicon-pass', failure: 'codicon-error', unknown: 'codicon-question', 'not-evaluated': 'codicon-warning',
};
const GraphStatusIcon: React.FC<{ status: GraphStatus; label?: string }> = ({ status, label }) => (
  <i className={`codicon shrink-0 ${icons[status]}`} role="img" aria-label={label ?? status} title={label ?? status} />
);
export default GraphStatusIcon;
