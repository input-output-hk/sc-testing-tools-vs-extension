import type { FilterTag } from '../../utils/filterTags';

interface ItemProps {
  tag: FilterTag;
  index: number;
  isHighlighted: boolean;
  onPick: (tag: FilterTag) => void;
  onHighlight: (index: number) => void;
}

const TagDropdownItem: React.FC<ItemProps> = ({ tag, index, isHighlighted, onPick, onHighlight }) => {
  /** Keeps the focus in the filter input, so the click lands before the input blurs. */
  const handleMouseDown = (event: React.MouseEvent) => {
    event.preventDefault();
  };

  /** Inserts this tag into the filter text. */
  const handleClick = () => {
    onPick(tag);
  };

  /** Moves the highlight to the hovered tag. */
  const handleMouseEnter = () => {
    onHighlight(index);
  };

  return (
    <button
      type="button"
      className={
        'flex items-center gap-1 w-full px-3 py-1 border-0 text-left text-[13px] cursor-pointer ' +
        (isHighlighted ?
          'bg-[var(--vscode-list-activeSelectionBackground)] text-[var(--vscode-list-activeSelectionForeground)]' :
          'bg-transparent text-[var(--vscode-editorSuggestWidget-foreground)]')
      }
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
    >
      <i className="codicon codicon-check opacity-0" />
      <span className="flex-1">@{tag.name}</span>
      {isHighlighted && <span className="text-[11px]">{tag.description}</span>}
    </button>
  );
};

interface Props {
  tags: Array<FilterTag>;
  highlightedIndex: number;
  onPick: (tag: FilterTag) => void;
  onHighlight: (index: number) => void;
}

const TagDropdown: React.FC<Props> = ({ tags, highlightedIndex, onPick, onHighlight }) => {
  /** Renders one tag row of the list. */
  const renderTag = (tag: FilterTag, index: number) => (
    <TagDropdownItem
      key={tag.name}
      tag={tag}
      index={index}
      isHighlighted={index === highlightedIndex}
      onPick={onPick}
      onHighlight={onHighlight}
    />
  );

  return (
    <div className="absolute left-2 right-2 top-full z-10 py-2 bg-[var(--vscode-editorSuggestWidget-background)] shadow-[0_2px_8px_var(--vscode-widget-shadow)]">
      {tags.map(renderTag)}
    </div>
  );
};

export default TagDropdown;
