import {
  VscodeTable,
  VscodeTableHeader,
  VscodeTableHeaderCell,
  VscodeTableBody,
  VscodeTableRow,
  VscodeTableCell
} from '@vscode-elements/react-elements';

import Tooltip from '../../../../components/Tooltip';

interface Column {
  key: string;
  label: string;
  clickable?: boolean;
}

interface Props {
  columns: Column[];
  rows: Array<Record<string, unknown>>;
  onClick?: (rowIndex: number, column: string) => void;
  tooltip?: { content: string; idPrefix: string };
}

const GenericTable: React.FC<Props> = ({ rows, columns, onClick, tooltip }) => (
  <VscodeTable responsive resizable className="border border-base-13">
    <VscodeTableHeader slot="header" className="bg-transparent">
      {columns.map((column, index) =>
        <VscodeTableHeaderCell
          key={index}
          className="p-2 text-center text-base-10 border border-base-13"
        >
          {column.label}
        </VscodeTableHeaderCell>
      )}
    </VscodeTableHeader>
    <VscodeTableBody slot="body">
      {rows.map((row, index) => (
        <VscodeTableRow key={index}>
          {columns.map((column, colIndex) => {
            const cellTooltip = column.clickable && onClick && tooltip
              ? { content: tooltip.content, id: `${tooltip.idPrefix}-${index}-${column.key}` }
              : undefined;
            return (
              <VscodeTableCell
                key={colIndex}
                id={cellTooltip?.id}
                className={`p-2 text-center border border-base-13 ${column.clickable ? 'cursor-pointer text-blue-05' : ''}`}
                onClick={column.clickable && onClick ? () => onClick(index, column.key) : undefined}
              >
                {Object.hasOwn(row, column.key) ? String(row[column.key]) : ''}
                {cellTooltip &&
                  <Tooltip
                    content={cellTooltip.content}
                    id={cellTooltip.id}
                    place="bottom-start"
                    positionStrategy="fixed"
                  />
                }
              </VscodeTableCell>
            );
          })}
        </VscodeTableRow>
      ))}
    </VscodeTableBody>
  </VscodeTable>
);

export default GenericTable;