import { useState } from 'react';
import { Handle, Position } from '@xyflow/react';

import { txValueToString } from '../../utils/txUtils';
import CopyButton from '../../../../components/CopyButton';

interface GraphNodeProps {
  data: GraphNode;
};

interface GraphNodeRowProps {
  label: string;
  value?: GraphNodeValue<string|undefined>;
  copyButton?: boolean;
  expanded: boolean;
}

interface GraphNodeFooterProps {
  onExpandNode: () => void;
}

const GraphNodeRow: React.FC<GraphNodeRowProps> = (props) => (
  props.expanded
    ? <GraphNodeExpandedRow {...props} />
    : <GraphNodeCollapsedRow {...props} />
);

const GraphNodeCollapsedRow: React.FC<GraphNodeRowProps> = ({ label, value, copyButton }) => {
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
        {!currentIsEmpty && copyButton && <CopyButton text={value.current!} />}
      </p>
      {isModified && hasPrevious && <p className="text-base-06 opacity-70 line-through truncate">{value.previous}</p>}
      <p className={`${!isModified ? 'text-blue-05' : 'text-yellow-04'} truncate`}>{value.current}</p>
    </div>
  );
};

const GraphNodeExpandedRow: React.FC<GraphNodeRowProps> = ({ label, value }) => {
  const currentIsEmpty = value?.current === undefined || value?.current === '';
  const previousIsEmpty = value?.previous === undefined || value?.previous === '';
  if (value === undefined || currentIsEmpty && previousIsEmpty) return;

  const isModified = value.current !== value.previous;
  const hasPrevious = value.previous !== undefined && value.previous.length > 0;

  return (
    <p className="w-full min-w-0 font-mono text-base-06 text-xs whitespace-pre-wrap break-all mt-2">
      {`${label}:`}<br/>
      {isModified && hasPrevious &&
        <>
          <span className="opacity-70">Previous value:</span>
          <br />
          {previousIsEmpty ?
            <i>Empty</i> :
            <span className="text-yellow-04">
              {value.previous}
            </span>
          }
          <br />
          <span className="opacity-70">Current value:</span>
          <br />
        </>
      }
      {currentIsEmpty ?
        <i>Empty</i> :
        <span className="text-blue-05">
          {value.current}
        </span>
      }
    </p>
  );
};

const GraphNodeFooter: React.FC<GraphNodeFooterProps> = ({ onExpandNode }) => (
  <div className="flex flex-row justify-end">
    <button
      onClick={onExpandNode}
      className="flex-none flex flex-row items-center gap-0.5 py-1 pl-1 pr-1.5 rounded-sm text-base-06 border border-base-15 bg-base-20 cursor-pointer"
    >
      <i className="codicon codicon-chevron-right" style={{ fontSize: '12px' }} />
      <span className="text-[12px] font-semibold">View details</span>
    </button>
  </div>
);

const GraphNodeTx: React.FC<GraphNodeTx> = (data) => {
  const [expanded, setExpanded] = useState<boolean>(false);
  return (
    <div className="relative">
      <div className="w-60 overflow-clip border border-base-13">
        <div className="flex flex-row items-center py-1 px-2 gap-1 bg-green-05">
          <span className="flex-1 text-base-01 text-[12px] capitalize">
            {data.label}
            {expanded ? ' - Full Details' : ''}
          </span>
          {expanded &&
            <button
            type="button"
            className="inline-flex size-6 shrink-0 items-center justify-center cursor-pointer"
            onClick={() => setExpanded(false)}
            >
              <i className="codicon codicon-close text-base-01" />
            </button>
          }
          {data.status !== 'success' &&
            <i className="codicon codicon-warning text-base-01" />
          }
        </div>
        <div className={`bg-base-18 ${expanded ? 'px-2 pb-2 max-h-130 overflow-y-scroll' : 'p-2'}`}>
          <GraphNodeRow
            copyButton
            label="Transaction ID"
            value={data.id}
            expanded={expanded}
          />
          <GraphNodeRow
            label="Mints"
            value={{
              current: txValueToString(data.mint.current),
              previous: txValueToString(data.mint.previous)
            }}
            expanded={expanded}
          />
          <GraphNodeRow
            label="Fee"
            value={{
              current: `${data.fee.current} lovelace`,
              previous: data.fee.previous ? `${data.fee.previous} lovelace` : undefined
            }}
            expanded={expanded}
          />
          <GraphNodeRow
            label="Signers"
            value={{
              current: data.signers.current?.join(', '),
              previous: data.signers.previous?.join(', ')
            }}
            expanded={expanded}
          />
          {!expanded &&
            <GraphNodeFooter onExpandNode={() => setExpanded(true)} />
          }
        </div>
      </div>
      <div className="absolute flex flex-col justify-around top-[25%] left-0 h-[50%] -translate-x-0.5">
        {[...Array(data.inputCount)].map((_, index) =>
          <Handle
            type="target"
            id={`tx-${data.identifier}-i-${index}`}
            key={`tx-${data.identifier}-i-${index}`}
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
            id={`tx-${data.identifier}-o-${index}`}
            key={`tx-${data.identifier}-o-${index}`}
            position={Position.Right}
            isConnectable={false}
            style={{
              position: 'relative', top: 0, left: 0,
              transform: 'none', background: 'white'
            }}
          />
        )}
        {[...Array(data.withdrawalCount)].map((_, index) =>
          <Handle
            type="source"
            id={`tx-${data.identifier}-w-${index}`}
            key={`tx-${data.identifier}-w-${index}`}
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
};

const getUTxOColor = (data: GraphNodeUTxO): string => {
  switch (data.type) {
    case "wallet":
      return "bg-blue-09";
    case "script":
      return "bg-[#72642A]";
    case "withdrawal":
      return "bg-purple-04";
  }
};

const GraphNodeUTxO: React.FC<GraphNodeUTxO> = (data) => {
  const [expanded, setExpanded] = useState<boolean>(false);
  return (
    <>
      <div className="w-60 overflow-clip border border-base-13">
        <div className={`flex flex-row items-center py-1 px-2 gap-1 ${getUTxOColor(data)}`}>
          <span className="flex-1 text-base-01 text-[12px] capitalize">
            {data.label}
            {expanded ? ' - Full Details' : ''}
          </span>
          {expanded &&
            <button
              type="button"
              className="inline-flex size-6 shrink-0 items-center justify-center cursor-pointer"
              onClick={() => setExpanded(false)}
            >
              <i className="codicon codicon-close text-base-01" />
            </button>
          }
        </div>
        <div className={`bg-base-18 ${expanded ? 'px-2 pb-2 max-h-130 overflow-y-scroll' : 'p-2'}`}>
          <GraphNodeRow
            copyButton
            label="Address"
            value={data.address}
            expanded={expanded}
          />
          <GraphNodeRow
            copyButton
            label="Stake Address"
            value={data.stakeAddress}
            expanded={expanded}
          />
          <GraphNodeRow
            copyButton
            label="UTxO"
            value={data.utxo}
            expanded={expanded}
          />
          <GraphNodeRow
            label="Amount"
            value={
              data.value ? {
                current: txValueToString(data.value.current),
                previous: txValueToString(data.value.previous)
              } : (
              data.amount ? {
                current: data.amount.current.toString(),
                previous: data.amount.previous?.toString()
              } :
              undefined)
            }
            expanded={expanded}
          />
          <GraphNodeRow
            label="Redeemer"
            value={data.redeemer}
            expanded={expanded}
          />
          <GraphNodeRow
            copyButton
            label="Datum"
            value={data.datum}
            expanded={expanded}
          />
          {!expanded &&
            <GraphNodeFooter onExpandNode={() => setExpanded(true)} />
          }
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
};

const GraphNode: React.FC<GraphNodeProps> = ({ data }) => (
  data.type === 'tx' ?
    <GraphNodeTx {...(data as GraphNodeTx)} /> :
    <GraphNodeUTxO {...(data as GraphNodeUTxO)} />
);

export default GraphNode;