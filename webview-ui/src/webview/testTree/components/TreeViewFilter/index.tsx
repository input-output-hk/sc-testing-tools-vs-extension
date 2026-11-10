import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import FilterMenu from './FilterMenu';
import TagDropdown from './TagDropdown';
import { parseFilterText } from '../../utils/treeUtils';
import { getKnownTags, getTagQuery, getTagSuggestions, insertTag, toggleTag, type FilterTag } from '../../utils/filterTags';

interface Props {
  filter: TestTreeFilter;
  placeholder?: string;
  onChangeFilter: (filter: TestTreeFilter) => void;
  onClear?: () => void;
}

const TreeViewFilter: React.FC<Props> = ({ filter, placeholder = 'Filter (e.g. text, !exclude, @tag)', onChangeFilter, onClear }) => {
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [cursor, setCursor] = useState<number | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);
  const [isTagListDismissed, setIsTagListDismissed] = useState<boolean>(false);
  const wrapperRef = useRef<HTMLSpanElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const pendingCursorRef = useRef<number | null>(null);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      const wrapper = wrapperRef.current;
      if (wrapper && !wrapper.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('click', handleDocumentClick, true);
    document.addEventListener('contextmenu', handleDocumentClick, true);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleDocumentClick, true);
      document.removeEventListener('contextmenu', handleDocumentClick, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  /** After a tag is inserted, puts the cursor right after it once the new text is rendered. */
  const restoreCursor = () => {
    const input = inputRef.current;
    if (input === null || pendingCursorRef.current === null) return;
    input.setSelectionRange(pendingCursorRef.current, pendingCursorRef.current);
    pendingCursorRef.current = null;
  };

  useLayoutEffect(restoreCursor, [filter.text]);

  const text = filter.text ?? '';
  const tagKeywords = parseFilterText(text).tagKeywords;
  const hasActiveFilter = getKnownTags(tagKeywords).length > 0;
  const tagQuery = cursor === null ? null : getTagQuery(text, cursor);
  const tagSuggestions = tagQuery === null ? [] : getTagSuggestions(tagQuery);
  const isTagListOpen = tagSuggestions.length > 0 && !isTagListDismissed;
  const activeIndex = highlightedIndex < tagSuggestions.length ? highlightedIndex : 0;

  const handleFilterTextInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChangeFilter({ ...filter, text: event.target.value });
    setCursor(event.target.selectionStart);
    setHighlightedIndex(0);
    setIsTagListDismissed(false);
  };

  /** Tracks the cursor, so clicks and arrow keys open or close the tag list for the word at the cursor. */
  const handleSelect = (event: React.SyntheticEvent<HTMLInputElement>) => {
    setCursor(event.currentTarget.selectionStart);
  };

  /** Closes the tag list when the input loses focus. */
  const handleBlur = () => {
    setCursor(null);
  };

  /** Replaces the word at the cursor with the picked tag and moves the cursor after it. */
  const handlePickTag = (tag: FilterTag) => {
    const result = insertTag(text, cursor ?? text.length, tag.name);
    pendingCursorRef.current = result.cursor;
    setCursor(result.cursor);
    onChangeFilter({ ...filter, text: result.text });
  };

  /** Moves the tag list highlight to the given row. */
  const handleHighlightTag = (index: number) => {
    setHighlightedIndex(index);
  };

  /** Navigates the tag list while it's open: ↑/↓ move, Enter/Tab pick, Esc closes. Other keys type normally. */
  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isTagListOpen) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightedIndex((activeIndex + 1) % tagSuggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedIndex((activeIndex - 1 + tagSuggestions.length) % tagSuggestions.length);
    } else if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault();
      handlePickTag(tagSuggestions[activeIndex]);
    } else if (event.key === 'Escape') {
      setIsTagListDismissed(true);
    }
  };

  const handleFilterToggle = () => {
    setIsMenuOpen((open) => !open);
  };

  /** Adds or removes the menu item's tag in the filter text, then closes the menu. */
  const handleToggleTag = (tagName: string) => {
    onChangeFilter({ ...filter, text: toggleTag(text, tagName) });
    setIsMenuOpen(false);
  };

  return (
    <div className="relative flex items-center w-full px-2 py-2">
      <input
        ref={inputRef}
        type="text"
        className={`w-full pl-2 ${onClear !== undefined ? 'pr-12' : 'pr-6'} py-1 text-sm rounded-[var(--vscode-cornerRadius-small)] border border-[var(--vscode-commandCenter-border)] bg-[var(--vscode-input-background)] text-[var(--vscode-input-foreground)] outline-none focus:border-[var(--vscode-focusBorder)]`}
        placeholder={placeholder}
        value={text}
        onChange={handleFilterTextInput}
        onSelect={handleSelect}
        onBlur={handleBlur}
        onKeyDown={handleInputKeyDown}
      />
      {isTagListOpen && (
        <TagDropdown
          tags={tagSuggestions}
          highlightedIndex={activeIndex}
          onPick={handlePickTag}
          onHighlight={handleHighlightTag}
        />
      )}
      <span
        ref={wrapperRef}
        className="absolute right-3 inline-flex items-center gap-1"
      >
        {onClear !== undefined && (
          <i
            className="codicon codicon-clear-all cursor-pointer opacity-70 hover:opacity-100"
            onClick={onClear}
            data-tooltip-id="tree-node-action"
            data-tooltip-content="Clear"
          />
        )}
        <button
          type="button"
          className={
            'group flex items-center justify-center rounded-[4px] border p-[3px] cursor-pointer ' +
            (hasActiveFilter ?
              'bg-blue-06/50 border-blue-06' :
              isMenuOpen ?
                'bg-base-12/50 border-transparent' :
                'bg-transparent border-transparent hover:bg-base-12/50')
          }
          onClick={handleFilterToggle}
          data-tooltip-id="tree-node-action"
          data-tooltip-content="Filter"
        >
          <i
            className={
              'codicon codicon-filter ' +
              (hasActiveFilter || isMenuOpen ? 'opacity-100' : 'opacity-70 group-hover:opacity-100')
            }
          />
        </button>
        <FilterMenu
          isOpen={isMenuOpen}
          activeTags={tagKeywords}
          onToggleTag={handleToggleTag}
        />
      </span>
    </div>
  );
};

export default TreeViewFilter;
