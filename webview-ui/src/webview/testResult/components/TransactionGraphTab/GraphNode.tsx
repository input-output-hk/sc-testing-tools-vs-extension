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
  accent?: boolean;
  multiline?: boolean;
}

interface GraphNodeFooterProps {
  onViewDetails: () => void;
}

const GraphNodeRow: React.FC<GraphNodeRowProps> = ({ label, value, multiline, accent }) => (
  <div className="text-[11px] pb-2 mb-2 border-b border-b-base-13">
    {multiline &&
      <div>
        <p className="text-base-06">{label}</p>
        <p className={`${accent ? 'text-blue-05' : 'text-base-06 opacity-70'} truncate`}>{value}</p>
      </div>
    }
    {!multiline &&
      <p className="truncate">
        <span className="text-base-06">{label}</span>
        <span className={`${accent ? 'text-blue-05' : 'text-base-06 opacity-70'} ml-1`}>{value}</span>
      </p>
    }
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
      <span className="flex-1 text-base-01 text-[12px]">Transaction</span>
      {!data.success &&
        <i className="codicon codicon-warning text-base-01" />
      }
    </div>
    <div className="p-2 bg-base-18">
      <GraphNodeRow
        multiline accent
        label="Transaction ID"
        value={data.id || ''}
      />
      {data.mint !== undefined &&
        <GraphNodeRow
          label="Mints"
          value={txValueToString(data.mint)}
        />
      }
      <GraphNodeRow
        label="Fee"
        value={`${data.fee} lovelace`}
      />
      {data.signers !== undefined && data.signers.length > 0 &&
        <GraphNodeRow
          label="Signers"
          value={data.signers.join(', ')}
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
      <span className="flex-1 text-base-01 text-[12px]">UTxO</span>
    </div>
    <div className="p-2 bg-base-18">
      <GraphNodeRow
        multiline accent
        label="Address"
        value={data.address}
      />
      <GraphNodeRow
        multiline accent
        label="UTxO"
        value={data.utxo}
      />
      <GraphNodeRow
        multiline accent
        label="Amount"
        value={txValueToString(data.value)}
      />
      {data.redeemerRaw !== undefined &&
        <GraphNodeRow
          label="Redeemer"
          value={data.redeemerRaw}
        />
      }
      {data.datum !== undefined &&
        <GraphNodeRow
          multiline accent
          label="Datum"
          value={data.datum}
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