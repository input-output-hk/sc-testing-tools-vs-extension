import type { MiniMapNodeProps } from '@xyflow/react';

const MiniMapNode: React.FC<MiniMapNodeProps> = ({ id, color, strokeColor, borderRadius, onClick, ...props }) => (
  <rect
    {...props}
    rx={borderRadius}
    ry={borderRadius}
    fill={color || '#CCCCCC'}
    stroke={strokeColor}
    onClick={event => onClick?.(event, id)}
  />
);

export default MiniMapNode;