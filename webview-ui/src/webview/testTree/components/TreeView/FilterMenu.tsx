interface FilterMenuProps {
  isOpen: boolean;
  statusFilter: TestStatus | null;
  onChange: (statusFilter: TestStatus | null) => void;
}

const selectStatus = (statusFilter: TestStatus | null, status: TestStatus): TestStatus | null =>
  statusFilter === status ? null : status;

const FilterMenu: React.FC<FilterMenuProps> = ({ isOpen, statusFilter, onChange }) => {
  if (!isOpen) {
    return null;
  }

  const handleToggleValid = () => onChange(selectStatus(statusFilter, "valid"));
  const handleToggleSkipped = () => onChange(selectStatus(statusFilter, "undetermined"));
  const handleToggleFailed = () => onChange(selectStatus(statusFilter, "invalid"));

  return (
    <div className="absolute right-0 top-full mt-1 z-10 w-56 bg-[#252526] shadow-lg py-2">
      <button
        type="button"
        className="flex items-center gap-1 w-full px-3 py-1 border-0 bg-transparent text-left cursor-pointer hover:bg-white/10"
        onClick={handleToggleValid}
      >
        <i className={`codicon codicon-check ${statusFilter === "valid" ? "opacity-100" : "opacity-0"}`} />
        <span>Show Valid tests</span>
      </button>
      <button
        type="button"
        className="flex items-center gap-1 w-full px-3 py-1 border-0 bg-transparent text-left cursor-pointer hover:bg-white/10"
        onClick={handleToggleSkipped}
      >
        <i className={`codicon codicon-check ${statusFilter === "undetermined" ? "opacity-100" : "opacity-0"}`} />
        <span>Show Skipped tests</span>
      </button>
      <button
        type="button"
        className="flex items-center gap-1 w-full px-3 py-1 border-0 bg-transparent text-left cursor-pointer hover:bg-white/10"
        onClick={handleToggleFailed}
      >
        <i className={`codicon codicon-check ${statusFilter === "invalid" ? "opacity-100" : "opacity-0"}`} />
        <span>Show Failed tests</span>
      </button>
      <div className="my-1 border-t border-[#454545]" />
      <div className="flex items-center gap-1 w-full px-3 py-1 opacity-40">
        <i className="codicon codicon-check opacity-0" />
        <span>Show positive tests</span>
      </div>
      <div className="flex items-center gap-1 w-full px-3 py-1 opacity-40">
        <i className="codicon codicon-check opacity-0" />
        <span>Show negative tests</span>
      </div>
      <div className="flex items-center gap-1 w-full px-3 py-1 opacity-40">
        <i className="codicon codicon-check opacity-0" />
        <span>Show Threat Models</span>
      </div>
    </div>
  );
};

export default FilterMenu;
