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
}

interface Props {
  columns: Column[];
  rows: Array<Record<string, unknown>>;
}

const GenericTable: React.FC<Props> = ({ rows, columns }) => (
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
              className="p-2 text-center border border-base-13"
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