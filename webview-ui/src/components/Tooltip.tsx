import { Tooltip as ReactTooltip, type PlacesType, type PositionStrategy } from 'react-tooltip';

interface Props {
  content?: string;
  id: string;
  place?: PlacesType;
  positionStrategy?: PositionStrategy;
  delayShow?: number;
  maxWidth?: string;
  render?: React.ComponentProps<typeof ReactTooltip>['render'];
}

const Tooltip: React.FC<Props> = ({ content, id, place = 'right', maxWidth = '250px', positionStrategy, delayShow = 300, render }) => {

  return (
    <>
      <ReactTooltip
        id={`${id}-tooltip`}
        anchorSelect={content !== undefined ? `#${id}` : undefined}
        content={content}
        render={render}
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
