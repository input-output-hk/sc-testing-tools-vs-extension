import { MarkerType, type Node } from '@xyflow/react';
import type { GraphNode, GraphEdge } from './graphMapper';

const COLUMN_WIDTH = 320;
const ROW_HEIGHT = 210;

const makeNode = (
  id: string,
  colIdx: number,
  rowIdx: number,
  totalRows: number,
  tallest: number,
  data: Record<string, unknown>,
): Node => ({
  id,
  type: "node",
  position: {
    x: (colIdx - 1) * COLUMN_WIDTH,
    y: ((tallest - totalRows) / 2) * ROW_HEIGHT + rowIdx * ROW_HEIGHT,
  },
  data,
});

const sumAdaAmount = (nodes: GraphNode[]): string | undefined => {
  let total = 0;
  let found = false;
  for (const n of nodes) {
    const field = n.card.fields.find((f) => f.label === "Amount");
    if (field) {
      const val = parseFloat(field.value);
      if (!isNaN(val)) {
        total += val;
        found = true;
      }
    }
  }
  return found ? `${total.toFixed(2)} ADA` : undefined;
};

// Maps column-grouped GraphNodes to ReactFlow nodes with x/y positions.
// Each column is vertically centred relative to the tallest column.
// Columns with >1 node are expanded by default; collapsed columns emit a single
// GroupTransactionCard node. Individual expanded nodes receive onToggleExpand
// so each card can collapse its group.
export const toFlowNodes = (
  cols: GraphNode[][],
  collapsedCols: Set<number>,
  onToggleCol: (colIdx: number) => void,
  onOpenDetail?: (txHash: string) => void,
): Node[] => {
  const tallest = Math.max(0, ...cols.filter(Boolean).map((c) => c.length));
  return cols.flatMap((col, colIdx) => {
    if (!col) return [];

    const isGroup = col.length > 1;
    const isCollapsed = isGroup && collapsedCols.has(colIdx);
    const toggle = () => onToggleCol(colIdx);

    if (isCollapsed) {
      return [
        makeNode(col[0].id, colIdx, 0, 1, tallest, {
          grouped: true,
          type: col[0].card.type,
          count: col.length,
          totalAmount: sumAdaAmount(col),
          onExpand: toggle,
        }),
      ];
    }

    return col.map((n, rowIdx) =>
      makeNode(n.id, colIdx, rowIdx, col.length, tallest, {
        grouped: false,
        ...n.card,
        ...(isGroup && { onToggleExpand: toggle }),
        ...(onOpenDetail && { onOpenDetail }),
      }),
    );
  });
};

// Maps GraphEdges to ReactFlow edge objects, with arrows and optional dashed style.
export const toFlowEdges = (edges: GraphEdge[]) =>
  edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: null,
    targetHandle: null,
    markerEnd: { type: MarkerType.ArrowClosed },
    ...(e.dashed && { style: { strokeDasharray: "6 3" } }),
  }));
