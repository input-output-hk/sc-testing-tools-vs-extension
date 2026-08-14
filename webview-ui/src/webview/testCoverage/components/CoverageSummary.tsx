const CoverageSummary: React.FC = () => (
  <div className="flex h-[33px] w-full shrink-0 items-center justify-center px-3 py-1">
    <div className="flex h-full w-full items-center gap-1 rounded bg-base-12/20 px-1 py-0.5">
      <i className="codicon codicon-coverage text-base-10" />
      <span className="text-[11px] font-medium text-base-10">Coverage: Entire Test Run</span>
    </div>
  </div>
);

export default CoverageSummary;
