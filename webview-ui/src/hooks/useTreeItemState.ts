import { useEffect, useRef } from 'react';

import type { VscodeTreeItem as VscodeTreeItemElement } from '@vscode-elements/elements/dist/vscode-tree-item/vscode-tree-item.js';

interface UseTreeItemStateOptions {
  onToggleCollapsed?: (isCollapsed: boolean) => void;
  onToggleSelection?: (isSelected: boolean) => void;
}

const useTreeItemState = ({ onToggleCollapsed, onToggleSelection }: UseTreeItemStateOptions): React.RefObject<VscodeTreeItemElement | null> => {
  const treeItemRef = useRef<VscodeTreeItemElement | null>(null);
  const onToggleCollapsedRef = useRef(onToggleCollapsed);
  const onToggleSelectionRef = useRef(onToggleSelection);

  useEffect(() => {
    onToggleCollapsedRef.current = onToggleCollapsed;
  }, [onToggleCollapsed]);

  useEffect(() => {
    onToggleSelectionRef.current = onToggleSelection;
  }, [onToggleSelection]);

  useEffect(() => {
    const treeItem = treeItemRef.current;
    if (!treeItem) return;

    let previousCollapsed = !treeItem.hasAttribute('open');
    let previousSelected = treeItem.hasAttribute('selected');

    const observer = new MutationObserver((mutations) => {
      if (mutations.some((mutation) => mutation.attributeName === 'open')) {
        const nextCollapsed = !treeItem.hasAttribute('open');
        if (nextCollapsed !== previousCollapsed) {
          previousCollapsed = nextCollapsed;
          onToggleCollapsedRef.current?.(nextCollapsed);
        }
      }
      if (mutations.some((mutation) => mutation.attributeName === 'selected')) {
        const nextSelected = treeItem.hasAttribute('selected');
        if (nextSelected !== previousSelected) {
          previousSelected = nextSelected;
          onToggleSelectionRef.current?.(nextSelected);
        }
      }
    });

    const attributeFilter: Array<string> = [];
    if (onToggleCollapsedRef.current) attributeFilter.push('open');
    if (onToggleSelectionRef.current) attributeFilter.push('selected');

    observer.observe(treeItem, {
      attributes: true,
      attributeFilter,
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return treeItemRef;
};

export default useTreeItemState;
