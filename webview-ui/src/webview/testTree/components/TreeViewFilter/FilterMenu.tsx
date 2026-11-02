interface Props {
  isOpen: boolean;
  activeTags: Array<string>;
  onToggleTag: (tagName: string) => void;
}

const FilterMenu: React.FC<Props> = ({ isOpen, activeTags, onToggleTag }) => {
  if (!isOpen) return null;

  const handleToggleStatusUndetermined = () => onToggleTag("undetermined");
  const handleToggleStatusValid = () => onToggleTag("valid");
  const handleToggleStatusFailed = () => onToggleTag("invalid");
  const handleToggleTypePositive = () => onToggleTag("positive");
  const handleToggleTypeNegative = () => onToggleTag("negative");
  const handleToggleTypeThreatModel = () => onToggleTag("threat-model");
  const handleToggleTypeUnitTest = () => onToggleTag("unit-test");

  return (
    <div className="absolute right-0 top-full mt-1 z-10 min-w-56 w-max bg-base-19 shadow-lg py-2">
      <button
        type="button"
        className="flex items-center gap-1 w-full px-3 py-1 border-0 bg-transparent text-left cursor-pointer hover:bg-white/10"
        onClick={handleToggleStatusUndetermined}
      >
        <i className={`codicon codicon-check ${activeTags.includes("undetermined") ? "opacity-100" : "opacity-0"}`} />
        <span>Show Undetermined Tests</span>
      </button>
      <button
        type="button"
        className="flex items-center gap-1 w-full px-3 py-1 border-0 bg-transparent text-left cursor-pointer hover:bg-white/10"
        onClick={handleToggleStatusValid}
      >
        <i className={`codicon codicon-check ${activeTags.includes("valid") ? "opacity-100" : "opacity-0"}`} />
        <span>Show Valid Tests</span>
      </button>
      <button
        type="button"
        className="flex items-center gap-1 w-full px-3 py-1 border-0 bg-transparent text-left cursor-pointer hover:bg-white/10"
        onClick={handleToggleStatusFailed}
      >
        <i className={`codicon codicon-check ${activeTags.includes("invalid") ? "opacity-100" : "opacity-0"}`} />
        <span>Show Invalid Tests</span>
      </button>
      <div className="my-1 border-t border-base-13" />
      <button
        type="button"
        className="flex items-center gap-1 w-full px-3 py-1 border-0 bg-transparent text-left cursor-pointer hover:bg-white/10"
        onClick={handleToggleTypePositive}
      >
        <i className={`codicon codicon-check ${activeTags.includes("positive") ? "opacity-100" : "opacity-0"}`} />
        <span>Show Positive Tests</span>
      </button>
      <button
        type="button"
        className="flex items-center gap-1 w-full px-3 py-1 border-0 bg-transparent text-left cursor-pointer hover:bg-white/10"
        onClick={handleToggleTypeNegative}
      >
        <i className={`codicon codicon-check ${activeTags.includes("negative") ? "opacity-100" : "opacity-0"}`} />
        <span>Show Negative Tests</span>
      </button>
      <button
        type="button"
        className="flex items-center gap-1 w-full px-3 py-1 border-0 bg-transparent text-left cursor-pointer hover:bg-white/10"
        onClick={handleToggleTypeThreatModel}
      >
        <i className={`codicon codicon-check ${activeTags.includes("threat-model") ? "opacity-100" : "opacity-0"}`} />
        <span>Show Threat Models</span>
      </button>
      <button
        type="button"
        className="flex items-center gap-1 w-full px-3 py-1 border-0 bg-transparent text-left cursor-pointer hover:bg-white/10"
        onClick={handleToggleTypeUnitTest}
      >
        <i className={`codicon codicon-check ${activeTags.includes("unit-test") ? "opacity-100" : "opacity-0"}`} />
        <span>Show Non-Testing Interface Tests</span>
      </button>
    </div>
  );
};

export default FilterMenu;
