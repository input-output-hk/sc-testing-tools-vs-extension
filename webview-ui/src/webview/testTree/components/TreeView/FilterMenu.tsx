interface FilterMenuProps {
  isOpen: boolean;
  statusFilters: Set<TestStatus>;
  onChange: (statusFilters: Set<TestStatus>) => void;
}

const toggleStatus = (statusFilters: Set<TestStatus>, status: TestStatus): Set<TestStatus> => {
  const nextStatusFilters = new Set(statusFilters);
  if (nextStatusFilters.has(status)) {
    nextStatusFilters.delete(status);
  } else {
    nextStatusFilters.add(status);
  }
  return nextStatusFilters;
};

const FilterMenu: React.FC<FilterMenuProps> = ({ isOpen, statusFilters, onChange }) => {
  if (!isOpen) {
    return null;
  }

  const handleToggleValid = () => onChange(toggleStatus(statusFilters, "valid"));
  const handleToggleSkipped = () => onChange(toggleStatus(statusFilters, "undetermined"));
  const handleToggleFailed = () => onChange(toggleStatus(statusFilters, "invalid"));

  return (
    <div className="absolute right-0 top-full mt-1 z-10 w-56 bg-[#252526] shadow-lg py-2">
      <button
        type="button"
        className="flex items-center gap-1 w-full px-3 py-1 border-0 bg-transparent text-left cursor-pointer hover:bg-white/10"
        onClick={handleToggleValid}
      >
        <i className={`codicon codicon-check ${statusFilters.has("valid") ? "opacity-100" : "opacity-0"}`} />
        <span>Show Valid tests</span>
      </button>
      <button
        type="button"
        className="flex items-center gap-1 w-full px-3 py-1 border-0 bg-transparent text-left cursor-pointer hover:bg-white/10"
        onClick={handleToggleSkipped}
      >
        <i className={`codicon codicon-check ${statusFilters.has("undetermined") ? "opacity-100" : "opacity-0"}`} />
        <span>Show Skipped tests</span>
      </button>
      <button
        type="button"
        className="flex items-center gap-1 w-full px-3 py-1 border-0 bg-transparent text-left cursor-pointer hover:bg-white/10"
        onClick={handleToggleFailed}
      >
        <i className={`codicon codicon-check ${statusFilters.has("invalid") ? "opacity-100" : "opacity-0"}`} />
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
