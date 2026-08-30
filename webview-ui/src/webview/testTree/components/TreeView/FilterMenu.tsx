interface FilterMenuProps {
  isOpen: boolean;
  typeFilter: TestType | null;
  statusFilter: RunStatus | null;
  onChangeType: (typeFilter: TestType | null) => void;
  onChangeStatus: (statusFilter: RunStatus | null) => void;
}

const selectStatus = (statusFilter: RunStatus | null, status: RunStatus): RunStatus | null =>
  statusFilter === status ? null : status;

const selectType = (typeFilter: TestType | null, type: TestType): TestType | null =>
  typeFilter === type ? null : type;

const FilterMenu: React.FC<FilterMenuProps> = ({ isOpen, typeFilter, statusFilter, onChangeType, onChangeStatus }) => {
  if (!isOpen) {
    return null;
  }

  const handleToggleStatusUndetermined = () => onChangeStatus(selectStatus(statusFilter, "undetermined"));
  const handleToggleStatusValid = () => onChangeStatus(selectStatus(statusFilter, "valid"));
  const handleToggleStatusFailed = () => onChangeStatus(selectStatus(statusFilter, "invalid"));
  const handleToggleTypePositive = () => onChangeType(selectType(typeFilter, "positive"));
  const handleToggleTypeNegative = () => onChangeType(selectType(typeFilter, "negative"));
  const handleToggleTypeThreatModel = () => onChangeType(selectType(typeFilter, "threat-model"));

  return (
    <div className="absolute right-0 top-full mt-1 z-10 w-56 bg-base-19 shadow-lg py-2">
      <button
        type="button"
        className="flex items-center gap-1 w-full px-3 py-1 border-0 bg-transparent text-left cursor-pointer hover:bg-white/10"
        onClick={handleToggleStatusUndetermined}
      >
        <i className={`codicon codicon-check ${statusFilter === "undetermined" ? "opacity-100" : "opacity-0"}`} />
        <span>Show undetermined tests</span>
      </button>
      <button
        type="button"
        className="flex items-center gap-1 w-full px-3 py-1 border-0 bg-transparent text-left cursor-pointer hover:bg-white/10"
        onClick={handleToggleStatusValid}
      >
        <i className={`codicon codicon-check ${statusFilter === "valid" ? "opacity-100" : "opacity-0"}`} />
        <span>Show valid tests</span>
      </button>
      <button
        type="button"
        className="flex items-center gap-1 w-full px-3 py-1 border-0 bg-transparent text-left cursor-pointer hover:bg-white/10"
        onClick={handleToggleStatusFailed}
      >
        <i className={`codicon codicon-check ${statusFilter === "invalid" ? "opacity-100" : "opacity-0"}`} />
        <span>Show failed tests</span>
      </button>
      <div className="my-1 border-t border-base-13" />
      <button
        type="button"
        className="flex items-center gap-1 w-full px-3 py-1 border-0 bg-transparent text-left cursor-pointer hover:bg-white/10"
        onClick={handleToggleTypePositive}
      >
        <i className={`codicon codicon-check ${typeFilter === "positive" ? "opacity-100" : "opacity-0"}`} />
        <span>Show positive tests</span>
      </button>
      <button
        type="button"
        className="flex items-center gap-1 w-full px-3 py-1 border-0 bg-transparent text-left cursor-pointer hover:bg-white/10"
        onClick={handleToggleTypeNegative}
      >
        <i className={`codicon codicon-check ${typeFilter === "negative" ? "opacity-100" : "opacity-0"}`} />
        <span>Show negative tests</span>
      </button>
      <button
        type="button"
        className="flex items-center gap-1 w-full px-3 py-1 border-0 bg-transparent text-left cursor-pointer hover:bg-white/10"
        onClick={handleToggleTypeThreatModel}
      >
        <i className={`codicon codicon-check ${typeFilter === "threat-model" ? "opacity-100" : "opacity-0"}`} />
        <span>Show threat models</span>
      </button>
    </div>
  );
};

export default FilterMenu;
