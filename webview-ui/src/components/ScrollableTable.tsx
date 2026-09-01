import { useEffect, useRef } from 'react';
import { VscodeTable } from '@vscode-elements/react-elements';

import type { VscodeTable as VscodeTableElement } from '@vscode-elements/elements/dist/vscode-table/vscode-table.js';
import type { VscodeScrollable as VscodeScrollableElement } from '@vscode-elements/elements/dist/vscode-scrollable/vscode-scrollable.js';

interface Props {
  isActive: boolean;
  children: React.ReactNode;
}

const ScrollableTable: React.FC<Props> = ({ isActive, children }) => {
  const tableRef = useRef<VscodeTableElement | null>(null);
  const scrollTopRef = useRef(0);

  useEffect(() => {
    const scrollable = tableRef.current?.shadowRoot?.querySelector('vscode-scrollable') as VscodeScrollableElement | null;
    if (!scrollable) return;

    const handleScroll = (event: Event): void => {
      scrollTopRef.current = (event as CustomEvent<number>).detail;
    };

    scrollable.addEventListener('vsc-scrollable-scroll', handleScroll);
    return () => scrollable.removeEventListener('vsc-scrollable-scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!isActive) return;
    requestAnimationFrame(() => {
      const scrollable = tableRef.current?.shadowRoot?.querySelector('vscode-scrollable') as VscodeScrollableElement | null;
      if (scrollable) scrollable.scrollPos = scrollTopRef.current;
    });
  }, [isActive]);

  return (
    <VscodeTable
      ref={tableRef}
      className="h-full flex flex-col border border-base-14"
      responsive resizable
    >
      {children}
    </VscodeTable>
  );
};

export default ScrollableTable;