import { Handle, Position } from '@xyflow/react';
import GraphNodeCard from './GraphNodeCard';
import type { GraphNodeCardProps } from './GraphNodeCard';
import GraphNodeGroupCard from './GraphNodeGroupCard';
import type { GraphNodeGroupCardProps } from './GraphNodeGroupCard';

type GraphCardNodeData =
  | ({ grouped: true } & GraphNodeGroupCardProps)
  | ({ grouped: false } & GraphNodeCardProps);

// Renders either a GroupGraphNodeCard (collapsed) or GraphNodeCard (expanded),
// wrapped in ReactFlow handles.
const GraphCardNode: React.FC<{ data: GraphCardNodeData }> = ({ data }) => (
  <>
    <Handle type="target" position={Position.Left} isConnectable={false} />
    {data.grouped
      ? <GraphNodeGroupCard {...data} />
      : <GraphNodeCard {...data} />}
    <Handle type="source" position={Position.Right} isConnectable={false} />
  </>
);

export default GraphCardNode;
