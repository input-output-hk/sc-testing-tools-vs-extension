import {
  VscodeTable,
  VscodeTableHeader,
  VscodeTableHeaderCell,
  VscodeTableBody,
  VscodeTableRow,
  VscodeTableCell
} from '@vscode-elements/react-elements';

interface Column {
  key: string;
  label: string;
  clickeable?: boolean;
}

interface Props {
  columns: Column[];
  rows: Array<Record<string, unknown>>;
  onClick?: (rowIndex: number, column: string) => void;
}

const GenericTable: React.FC<Props> = ({ rows, columns, onClick }) => (
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
          {columns.map((column, colIndex) => (
            <VscodeTableCell
              key={colIndex}
              className={`p-2 text-center border border-base-13 ${column.clickeable ? 'cursor-pointer text-blue-05' : ''}`}
              onClick={column.clickeable && onClick ? () => onClick(index, column.key) : undefined}
            >
              {Object.hasOwn(row, column.key) ? String(row[column.key]) : ''}
            </VscodeTableCell>
          ))}
        </VscodeTableRow>
      ))}
    </VscodeTableBody>
  </VscodeTable>
);

export default GenericTable;