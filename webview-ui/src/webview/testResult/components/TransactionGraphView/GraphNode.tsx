import { Handle, Position } from '@xyflow/react';

import { txValueToString } from '../../utils/txUtils';

interface GraphNodeProps {
  data: GraphNodeData;
};

interface GraphNodeData extends GraphNode {
  onViewDetails: (node: GraphNode) => void;
};

interface GraphNodeTxData extends GraphNodeTx {
  onViewDetails: (node: GraphNode) => void;
}

interface GraphNodeUTxOData extends GraphNodeUTxO {
  onViewDetails: (node: GraphNode) => void;
}

interface GraphNodeRowProps {
  label: string;
  value?: GraphNodeValue<string|undefined>;
}

interface GraphNodeFooterProps {
  onViewDetails: () => void;
}

const GraphNodeRow: React.FC<GraphNodeRowProps> = ({ label, value }) => {
  const currentIsEmpty = value?.current === undefined || value?.current === '';
  const previousIsEmpty = value?.previous === undefined || value?.previous === '';
  if (value === undefined || currentIsEmpty && previousIsEmpty) return;

  const isModified = value.current !== value.previous;
  const hasPrevious = value.previous !== undefined && value.previous.length > 0;
  return (
    <div className="text-[11px] pb-2 mb-2 border-b border-b-base-13">
      <p className="flex flex-row items-center gap-1">
        {isModified && <i className="codicon codicon-edit text-yellow-04" style={{ fontSize: '11px' }} />}
        <span className="text-base-06">{label}</span>
      </p>
      {isModified && hasPrevious && <p className="text-base-06 opacity-70 line-through truncate">{value.previous}</p>}
      <p className={`${!isModified ? 'text-blue-05' : 'text-yellow-04'} truncate`}>{value.current}</p>
    </div>
  );
};

const GraphNodeFooter: React.FC<GraphNodeFooterProps> = ({ onViewDetails }) => (
  <div className="flex flex-row justify-end">
    <button
      onClick={onViewDetails}
      className="flex-none flex flex-row items-center gap-0.5 py-1 pl-1 pr-1.5 rounded-sm text-base-06 border border-base-15 bg-base-20 cursor-pointer"
    >
      <i className="codicon codicon-chevron-right" style={{ fontSize: '12px' }} />
      <span className="text-[12px] font-semibold">View details</span>
    </button>
  </div>
);

const GraphNodeTx: React.FC<GraphNodeTxData> = (data) => (
  <div className="relative">
    <div className="w-60 overflow-clip border border-base-13">
      <div className="flex flex-row items-center py-1 px-2 gap-1 bg-green-05">
        <span className="flex-1 text-base-01 text-[12px]">
          {`Transaction #${data.index + 1}`}
        </span>
        {data.status !== 'success' &&
          <i className="codicon codicon-warning text-base-01" />
        }
      </div>
      <div className="p-2 bg-base-18">
        <GraphNodeRow
          label="Transaction ID"
          value={data.id}
        />
        <GraphNodeRow
          label="Mints"
          value={{
            current: txValueToString(data.mint.current),
            previous: txValueToString(data.mint.previous)
          }}
        />
        <GraphNodeRow
          label="Fee"
          value={{
            current: `${data.fee.current} lovelace`,
            previous: data.fee.previous ? `${data.fee.previous} lovelace` : undefined
          }}
        />
        <GraphNodeRow
          label="Signers"
          value={{
            current: data.signers.current?.join(', '),
            previous: data.signers.previous?.join(', ')
          }}
        />
        <GraphNodeFooter
          onViewDetails={() => data.onViewDetails(data)}
        />
      </div>
    </div>
    <div className="absolute flex flex-col justify-around top-[25%] left-0 h-[50%] -translate-x-0.5">
      {[...Array(data.inputCount)].map((_, index) =>
        <Handle
          type="target"
          id={`tx-${data.id.current}-i-${index}`}
          key={`tx-${data.id.current}-i-${index}`}
          position={Position.Left}
          isConnectable={false}
          style={{
            position: 'relative', top: 0, left: 0,
            transform: 'none', opacity: 0
          }}
        />
      )}
    </div>
    <div className="absolute flex flex-col justify-around top-[25%] right-0 h-[50%] translate-x-1">
      {[...Array(data.outputCount)].map((_, index) =>
        <Handle
          type="source"
          id={`tx-${data.id.current}-o-${index}`}
          key={`tx-${data.id.current}-o-${index}`}
          position={Position.Right}
          isConnectable={false}
          style={{
            position: 'relative', top: 0, left: 0,
            transform: 'none', background: 'white'
          }}
        />
      )}
    </div>
  </div>
);

const GraphNodeUTxO: React.FC<GraphNodeUTxOData> = (data) => (
  <>
    <div className="w-60 overflow-clip border border-base-13">
      <div className="flex flex-row items-center py-1 px-2 gap-1 bg-blue-09">
        <span className="flex-1 text-base-01 text-[12px]">
          UTxO{data.index !== undefined ? ` #${data.index}` : ''}
        </span>
      </div>
      <div className="p-2 bg-base-18">
        <GraphNodeRow
          label="Address"
          value={data.address}
        />
        <GraphNodeRow
          label="UTxO"
          value={data.utxo}
        />
        <GraphNodeRow
          label="Amount"
          value={{
            current: txValueToString(data.value.current),
            previous: txValueToString(data.value.previous)
          }}
        />
        <GraphNodeRow
          label="Redeemer"
          value={data.redeemer}
        />
        <GraphNodeRow
          label="Datum"
          value={data.datum}
        />
        <GraphNodeFooter
          onViewDetails={() => data.onViewDetails(data)}
        />
      </div>
    </div>
    <Handle
      type="target"
      position={Position.Left}
      isConnectable={false}
      style={{ opacity: 0 }}
    />
    {data.consumed &&
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={false}
        style={{ background: 'white' }}
      />
    }
  </>
);

const GraphNode: React.FC<GraphNodeProps> = ({ data }) => (
  data.type === 'tx' ?
    <GraphNodeTx {...(data as GraphNodeTxData)} /> :
    <GraphNodeUTxO {...(data as GraphNodeUTxOData)} />
);

export default GraphNode;