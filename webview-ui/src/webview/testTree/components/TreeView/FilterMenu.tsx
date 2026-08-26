interface FilterMenuProps {
  isOpen: boolean;
  statusFilter: RunStatus | null;
  onChange: (statusFilter: RunStatus | null) => void;
  typeFilter: TestType | null;
  onTypeChange: (typeFilter: TestType | null) => void;
}

const selectStatus = (statusFilter: RunStatus | null, status: RunStatus): RunStatus | null =>
  statusFilter === status ? null : status;

const selectType = (typeFilter: TestType | null, type: TestType): TestType | null =>
  typeFilter === type ? null : type;

const FilterMenu: React.FC<FilterMenuProps> = ({ isOpen, statusFilter, onChange, typeFilter, onTypeChange }) => {
  if (!isOpen) {
    return null;
  }

  const handleToggleValid = () => onChange(selectStatus(statusFilter, "valid"));
  const handleToggleSkipped = () => onChange(selectStatus(statusFilter, "undetermined"));
  const handleToggleFailed = () => onChange(selectStatus(statusFilter, "invalid"));
  const handleToggleShowPositive = () => onTypeChange(selectType(typeFilter, "positive"));
  const handleToggleShowNegative = () => onTypeChange(selectType(typeFilter, "negative"));
  const handleToggleShowThreatModel = () => onTypeChange(selectType(typeFilter, "threat-model"));

  return (
    <div className="absolute right-0 top-full mt-1 z-10 w-56 bg-base-19 shadow-lg py-2">
      <button
        type="button"
        className="flex items-center gap-1 w-full px-3 py-1 border-0 bg-transparent text-left cursor-pointer hover:bg-white/10"
        onClick={handleToggleValid}
      >
        <i className={`codicon codicon-check ${statusFilter === "valid" ? "opacity-100" : "opacity-0"}`} />
        <span>Show valid tests</span>
      </button>
      <button
        type="button"
        className="flex items-center gap-1 w-full px-3 py-1 border-0 bg-transparent text-left cursor-pointer hover:bg-white/10"
        onClick={handleToggleSkipped}
      >
        <i className={`codicon codicon-check ${statusFilter === "undetermined" ? "opacity-100" : "opacity-0"}`} />
        <span>Show skipped tests</span>
      </button>
      <button
        type="button"
        className="flex items-center gap-1 w-full px-3 py-1 border-0 bg-transparent text-left cursor-pointer hover:bg-white/10"
        onClick={handleToggleFailed}
      >
        <i className={`codicon codicon-check ${statusFilter === "invalid" ? "opacity-100" : "opacity-0"}`} />
        <span>Show failed tests</span>
      </button>
      <div className="my-1 border-t border-[#454545]" />
      <button
        type="button"
        className="flex items-center gap-1 w-full px-3 py-1 border-0 bg-transparent text-left cursor-pointer hover:bg-white/10"
        onClick={handleToggleShowPositive}
      >
        <i className={`codicon codicon-check ${typeFilter === "positive" ? "opacity-100" : "opacity-0"}`} />
        <span>Show positive tests</span>
      </button>
      <button
        type="button"
        className="flex items-center gap-1 w-full px-3 py-1 border-0 bg-transparent text-left cursor-pointer hover:bg-white/10"
        onClick={handleToggleShowNegative}
      >
        <i className={`codicon codicon-check ${typeFilter === "negative" ? "opacity-100" : "opacity-0"}`} />
        <span>Show negative tests</span>
      </button>
      <button
        type="button"
        className="flex items-center gap-1 w-full px-3 py-1 border-0 bg-transparent text-left cursor-pointer hover:bg-white/10"
        onClick={handleToggleShowThreatModel}
      >
        <i className={`codicon codicon-check ${typeFilter === "threat-model" ? "opacity-100" : "opacity-0"}`} />
        <span>Show Threat Models</span>
      </button>
    </div>
  );
};

export default FilterMenu;
