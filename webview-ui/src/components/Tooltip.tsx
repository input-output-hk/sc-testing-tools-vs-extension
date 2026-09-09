import { Tooltip as ReactTooltip, type PlacesType, type PositionStrategy } from 'react-tooltip';

interface Props {
  content: string;
  id: string;
  place?: PlacesType;
  maxWidth?: string;
  positionStrategy?: PositionStrategy;
  delayShow?: number;
}

const Tooltip: React.FC<Props> = ({ content, id, place = 'right', maxWidth = '250px', positionStrategy, delayShow = 300 }) => {

  return (
    <>
      <ReactTooltip
        id={`${id}-tooltip`}
        anchorSelect={`#${id}`}
        content={content}
        place={place}
        positionStrategy={positionStrategy}
        delayShow={delayShow}
        opacity={1}
        border="1px solid var(--vscode-editorHoverWidget-border, #454545)"
        className="py-1 px-2 text-[12px] font-normal z-[9999] whitespace-pre-wrap break-words"
        style={{
          backgroundColor: 'var(--vscode-editorHoverWidget-background, #252526)',
          color: 'var(--vscode-editorHoverWidget-foreground, #cccccc)',
          maxWidth,
        }}
      />
    </>
  );
};

export default Tooltip;
