import { useState } from 'react';

import Tooltip from './Tooltip';

interface Props {
  id: string;
  text: string;
}

const CopyButton: React.FC<Props> = ({ id, text }) => {
  const [copied, setCopied] = useState(false);
  const tooltipId = `copy-button-${id}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setCopied(false));
    });
  };

  return (
    <>
      <button
        type="button"
        id={tooltipId}
        className="flex items-center justify-center border-0 bg-transparent p-0 opacity-60 hover:opacity-100 cursor-pointer"
        onClick={handleCopy}
      >
        <i
          className={`codicon codicon-copy ${copied ? 'text-blue-05' : 'text-base-06 transition-colors duration-300'}`}
          style={{ fontSize: '11px' }}
        />
      </button>
      <Tooltip id={tooltipId} content="Copy" place="top" />
    </>
  );
};

export default CopyButton;
