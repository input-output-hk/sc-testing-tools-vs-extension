import { useState } from 'react';

interface Props {
  text: string;
}

const CopyButton: React.FC<Props> = ({ text }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 250);
    navigator.clipboard.writeText(text);
  };

  return (
    <button
      type="button"
      className="flex items-center justify-center border-0 bg-transparent p-0 opacity-60 hover:opacity-100 cursor-pointer"
      onClick={handleCopy}
    >
      <i
        className={`codicon codicon-copy ${copied ? 'text-blue-05' : 'text-base-06 transition-colors duration-300'}`}
        style={{ fontSize: '11px' }}
      />
    </button>
  );
};

export default CopyButton;
