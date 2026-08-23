import type { MiniMapNodeProps } from '@xyflow/react';

const MiniMapNode: React.FC<MiniMapNodeProps> = ({ id, color, borderRadius, onClick, ...props }) => (
  <rect
    {...props}
    rx={borderRadius}
    ry={borderRadius}
    fill={color || '#CCCCCC'}
    onClick={event => onClick?.(event, id)}
  />
);

export default MiniMapNode;