import { Tooltip as ReactTooltip, type PlacesType } from 'react-tooltip';

interface Props {
  content: string;
  id: string;
  place?: PlacesType;
}

const Tooltip: React.FC<Props> = ({ content, id, place = 'right' }) => {

  return (
    <>
      <ReactTooltip
        id={id}
        anchorSelect={`#${id}`}
        content={content}
        place={place}
        delayShow={300}
        border="1px solid var(--vscode-editorHoverWidget-border, #454545)"
        // TODO: consider dynamically adjusting the max width based on passing in a prop
        className="py-1 px-2 text-[12px] font-normal !opacity-100 z-[9999] max-w-[250px] whitespace-pre-wrap break-words"
        style={{
          backgroundColor: 'var(--vscode-editorHoverWidget-background, #252526)',
          color: 'var(--vscode-editorHoverWidget-foreground, #cccccc)',
        }}
      />
    </>
  );
};

export default Tooltip;
