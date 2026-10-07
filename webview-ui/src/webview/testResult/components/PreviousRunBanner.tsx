interface Props {
  startedOn: number;
}

const PreviousRunBanner: React.FC<Props> = ({ startedOn }) => (
  <div className="flex items-center gap-2 mb-3 px-3 py-1.5 rounded-[var(--vscode-cornerRadius-small)] border border-[var(--vscode-inputValidation-infoBorder)] bg-[var(--vscode-inputValidation-infoBackground)] text-[var(--vscode-foreground)]">
    <i className="codicon codicon-history shrink-0" />
    <span>Viewing a previous test run</span>
    <span className="px-1.5 rounded-[var(--vscode-cornerRadius-small)] font-semibold bg-[var(--vscode-badge-background)] text-[var(--vscode-badge-foreground)]">
      {new Date(startedOn).toLocaleString()}
    </span>
  </div>
);

export default PreviousRunBanner;
