import React from 'react';

export interface GraphNodeCardProps extends Record<string, unknown> {
  type: 'tx' | 'utxo';
  identifier: string;
  address: string;
  fields: { label: string; value: string }[];
  onToggleExpand?: () => void;
  onOpenDetail?: (txHash: string) => void;
}

const HEADER_BG: Record<GraphNodeCardProps['type'], string> = {
  utxo: 'bg-blue-09',
  tx: 'bg-green-05',
};

const Separator = () => (
  <div className="px-2 py-1">
    <div className="h-px bg-base-13 w-full" />
  </div>
);

// Card rendered inside a ReactFlow node. type controls the header colour: Tx (green) or UTxO (blue).
// Only the first 2 fields are shown inline; additional fields are hidden behind a "View details" button.
const GraphNodeCard: React.FC<GraphNodeCardProps> = ({
  type,
  identifier,
  address,
  fields,
  onToggleExpand,
  onOpenDetail,
}) => {
  return (
    <div className="flex flex-col w-55 rounded-[5px] overflow-clip">
      <div className={`flex flex-row items-center ${HEADER_BG[type]} h-5.5 px-1 gap-1`}>
        <span className="text-base-01 text-[12px]">{type}</span>
        <span className="bg-blue-01 text-base-13 text-[9px] rounded px-1 py-px">
          {identifier}
        </span>
        {(onToggleExpand || (type === 'tx' && onOpenDetail)) && (
          <div className="ml-auto flex items-center">
            {onToggleExpand && (
              <button onClick={onToggleExpand} className="cursor-pointer flex items-center p-1">
                <i className="codicon codicon-collapse-all text-base-01 text-[14px]" />
              </button>
            )}
            {type === 'tx' && onOpenDetail && (
              <button
                onClick={() => onOpenDetail(address)}
                className="cursor-pointer flex items-center p-1"
              >
                <i className="codicon codicon-open-preview text-base-01 text-[14px]" />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col bg-base-18 pt-2 text-base-06 text-[11px]">
        <div className="flex flex-col px-3 py-0.75">
          <span>Address</span>
          <span className="opacity-70">{address}</span>
        </div>
        <Separator />

        {fields.slice(0, 2).map((field) => (
          <React.Fragment key={field.label}>
            <div className="flex flex-row items-center gap-1 px-3 py-0.75">
              <span>{field.label}</span>
              <span className="opacity-70">{field.value}</span>
            </div>
            <Separator />
          </React.Fragment>
        ))}

        {fields.length > 2 && (
          <div className="px-3 pb-2">
            <button className="flex items-center gap-1 bg-base-20 border border-base-15 rounded px-1 py-1 text-[12px] cursor-pointer">
              <i className="codicon codicon-chevron-right text-[14px]" />
              View details
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GraphNodeCard;
