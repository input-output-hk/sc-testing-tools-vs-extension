import { Handle, Position } from '@xyflow/react';

import { txValueToString } from '../../utils/txUtils';

interface GraphNodeProps {
  data: GraphNodeData;
};

interface GraphNodeData extends GraphNode {
  hasSource?: boolean;
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
  value: string;
  originalValue?: string;
}

interface GraphNodeFooterProps {
  onViewDetails: () => void;
}

const isSuccess = (data: TxWithContext): boolean => {
  if (data.context.origin === 'transition') {
    return (data as TxWithTransition).context.status.status === 'success';
  }
  if (data.context.origin === 'threat-model') {
    return (data as TxWithThreatModel).context.outcome.status === 'passed';
  }
  return false;
};

const getTxOriginalValue = (data: TxWithContext, field: string): string | undefined => {
  if (data.context.origin === 'transition') return;
  const fields = (data as TxWithThreatModel).context.originalFields || {};
  return Object.hasOwn(fields, field) ? fields[field].value : undefined;
}

const getUTxOOriginalValue = (data: UTxOWithContext, field: string): string | undefined => {
  if (data.context.origin === 'transition') return;
  const fields = data.context.originalFields || {};
  return Object.hasOwn(fields, field) ? fields[field].value : undefined;
}

const GraphNodeRow: React.FC<GraphNodeRowProps> = ({ label, value, originalValue }) => (
  <div className="text-[11px] pb-2 mb-2 border-b border-b-base-13">
    <p className="flex flex-row items-center gap-1">
      {originalValue && <i className="codicon codicon-edit text-yellow-04" style={{ fontSize: '11px' }} />}
      <span className="text-base-06">{label}</span>
    </p>
    {originalValue && <p className="text-base-06 opacity-70 line-through truncate">{originalValue}</p>}
    <p className={`${!originalValue ? 'text-blue-05' : 'text-yellow-04'} truncate`}>{value}</p>
  </div>
);

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
  <div className="w-60 overflow-clip border border-base-13">
    <div className="flex flex-row items-center py-1 px-2 gap-1 bg-green-05">
      <span className="flex-1 text-base-01 text-[12px]">
        {`Transaction #${data.context.index + 1}`}
      </span>
      {!isSuccess(data) &&
        <i className="codicon codicon-warning text-base-01" />
      }
    </div>
    <div className="p-2 bg-base-18">
      <GraphNodeRow
        label="Transaction ID"
        value={data.id || ''}
        originalValue={getTxOriginalValue(data, 'id')}
      />
      {(data.mint !== undefined || getTxOriginalValue(data, 'mint') !== undefined) &&
        <GraphNodeRow
          label="Mints"
          value={txValueToString(data.mint)}
          originalValue={getTxOriginalValue(data, 'mint')}
        />
      }
      <GraphNodeRow
        label="Fee"
        value={`${data.fee} lovelace`}
        originalValue={getTxOriginalValue(data, 'fee')}
      />
      {data.signers !== undefined && data.signers.length > 0 &&
        <GraphNodeRow
          label="Signers"
          value={data.signers.join(', ')}
          originalValue={getTxOriginalValue(data, 'signers')}
        />
      }
      <GraphNodeFooter
        onViewDetails={() => data.onViewDetails(data)}
      />
    </div>
  </div>
);

const GraphNodeUTxO: React.FC<GraphNodeUTxOData> = (data) => (
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
        originalValue={getUTxOOriginalValue(data, 'address')}
      />
      <GraphNodeRow
        label="UTxO"
        value={data.utxo}
        originalValue={getUTxOOriginalValue(data, 'utxo')}
      />
      <GraphNodeRow
        label="Amount"
        value={txValueToString(data.value)}
        originalValue={getUTxOOriginalValue(data, 'value')}
      />
      {data.redeemerRaw !== undefined &&
        <GraphNodeRow
          label="Redeemer"
          value={data.redeemerRaw}
          originalValue={getUTxOOriginalValue(data, 'redeemer')}
        />
      }
      {data.datum !== undefined &&
        <GraphNodeRow
          label="Datum"
          value={data.datum}
          originalValue={getUTxOOriginalValue(data, 'datum')}
        />
      }
      <GraphNodeFooter
        onViewDetails={() => data.onViewDetails(data)}
      />
    </div>
  </div>
);

const GraphNode: React.FC<GraphNodeProps> = ({ data }) => (
  <>
    <Handle
      type="target"
      position={Position.Left}
      isConnectable={false}
      style={{ opacity: 0 }}
    />
    {data.type === 'tx' ?
        <GraphNodeTx {...(data as GraphNodeTxData)} /> :
        <GraphNodeUTxO {...(data as GraphNodeUTxOData)} />
    }
    {data.hasSource === true &&
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={false}
        style={{ background: 'white' }}
      />
    }
  </>
);

export default GraphNode;