interface Props {
  isOpen: boolean;
  filter: TestTreeFilter;
  onChangeFilter: (filter: TestTreeFilter) => void;
}

const selectStatus = (filter: TestTreeFilter, status: RunStatus): TestTreeFilter =>
  filter.status === status ? { ...filter, status: undefined } : { ...filter, status };

const selectType = (filter: TestTreeFilter, type: TestType): TestTreeFilter =>
  filter.type === type ? { ...filter, type: undefined } : { ...filter, type };

const FilterMenu: React.FC<Props> = ({ isOpen, filter, onChangeFilter }) => {
  if (!isOpen) return null;

  const handleToggleStatusUndetermined = () => onChangeFilter(selectStatus(filter, "undetermined"));
  const handleToggleStatusValid = () => onChangeFilter(selectStatus(filter, "valid"));
  const handleToggleStatusFailed = () => onChangeFilter(selectStatus(filter, "invalid"));
  const handleToggleTypePositive = () => onChangeFilter(selectType(filter, "positive"));
  const handleToggleTypeNegative = () => onChangeFilter(selectType(filter, "negative"));
  const handleToggleTypeThreatModel = () => onChangeFilter(selectType(filter, "threat-model"));

  return (
    <div className="absolute right-0 top-full mt-1 z-10 w-56 bg-base-19 shadow-lg py-2">
      <button
        type="button"
        className="flex items-center gap-1 w-full px-3 py-1 border-0 bg-transparent text-left cursor-pointer hover:bg-white/10"
        onClick={handleToggleStatusUndetermined}
      >
        <i className={`codicon codicon-check ${filter.status === "undetermined" ? "opacity-100" : "opacity-0"}`} />
        <span>Show undetermined tests</span>
      </button>
      <button
        type="button"
        className="flex items-center gap-1 w-full px-3 py-1 border-0 bg-transparent text-left cursor-pointer hover:bg-white/10"
        onClick={handleToggleStatusValid}
      >
        <i className={`codicon codicon-check ${filter.status === "valid" ? "opacity-100" : "opacity-0"}`} />
        <span>Show valid tests</span>
      </button>
      <button
        type="button"
        className="flex items-center gap-1 w-full px-3 py-1 border-0 bg-transparent text-left cursor-pointer hover:bg-white/10"
        onClick={handleToggleStatusFailed}
      >
        <i className={`codicon codicon-check ${filter.status === "invalid" ? "opacity-100" : "opacity-0"}`} />
        <span>Show failed tests</span>
      </button>
      <div className="my-1 border-t border-base-13" />
      <button
        type="button"
        className="flex items-center gap-1 w-full px-3 py-1 border-0 bg-transparent text-left cursor-pointer hover:bg-white/10"
        onClick={handleToggleTypePositive}
      >
        <i className={`codicon codicon-check ${filter.type === "positive" ? "opacity-100" : "opacity-0"}`} />
        <span>Show positive tests</span>
      </button>
      <button
        type="button"
        className="flex items-center gap-1 w-full px-3 py-1 border-0 bg-transparent text-left cursor-pointer hover:bg-white/10"
        onClick={handleToggleTypeNegative}
      >
        <i className={`codicon codicon-check ${filter.type === "negative" ? "opacity-100" : "opacity-0"}`} />
        <span>Show negative tests</span>
      </button>
      <button
        type="button"
        className="flex items-center gap-1 w-full px-3 py-1 border-0 bg-transparent text-left cursor-pointer hover:bg-white/10"
        onClick={handleToggleTypeThreatModel}
      >
        <i className={`codicon codicon-check ${filter.type === "threat-model" ? "opacity-100" : "opacity-0"}`} />
        <span>Show threat models</span>
      </button>
    </div>
  );
};

export default FilterMenu;
