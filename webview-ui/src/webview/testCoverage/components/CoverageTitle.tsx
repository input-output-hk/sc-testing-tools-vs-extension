interface Props {
  text: string;
  icon?: boolean;
  onClear?: () => void;
}

const CoverageTitle: React.FC<Props> = ({ text, icon, onClear }) => (
  <div className="flex h-[33px] w-full shrink-0 items-center justify-center px-3 py-1">
    <div className="flex h-full w-full items-center gap-1 rounded bg-base-12/20 px-2 py-0.5">
      {icon && <i className="codicon codicon-coverage text-base-10" />}
      <span className="flex-1 min-w-0 overflow-hidden whitespace-nowrap text-ellipsis text-[11px] font-medium text-base-10">
        {text}
      </span>
      {onClear &&
        <button
          type="button"
          className="flex h-4 w-4 shrink-0 items-center justify-center border-0 bg-transparent p-0 opacity-60 hover:opacity-100 cursor-pointer"
          onClickCapture={onClear}
        >
          <i className="codicon codicon-close text-base-10" />
        </button>
      }
    </div>
  </div>
);

export default CoverageTitle;
