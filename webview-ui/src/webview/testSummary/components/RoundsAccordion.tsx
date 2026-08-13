import React, { useState } from 'react';
import { VscodeCollapsible } from '@vscode-elements/react-elements';

interface RoundsAccordionProps {
    title: string;
    rounds: Array<number>;
    defaultOpen?: boolean;
}

const RoundsAccordion: React.FC<RoundsAccordionProps> = ({ title, rounds, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <>
    <VscodeCollapsible
      heading={title}
      open={isOpen}
      onToggle={() => setIsOpen(!isOpen)}
      className="mb-4"
      style={{ '--vscode-focusBorder': 'transparent' } as React.CSSProperties}
    >
      <div className="flex flex-wrap gap-2 mt-3">
        {rounds.map((round) => (
          <button
            key={round}
            type="button"
            className={`px-3 py-1 rounded-md border border-base-12 text-base-06 cursor-pointer hover:bg-base-19`}
          >
            {round}
          </button>
        ))}
      </div>
    </VscodeCollapsible>
    </>
  );
};

export default RoundsAccordion;