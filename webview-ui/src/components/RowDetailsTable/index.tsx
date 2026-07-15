export interface RowDetailsTableColumn {
  id: string;
  label: string;
  align?: 'left' | 'center';
}

interface Props {
  columns: RowDetailsTableColumn[];
  rows: React.ReactNode[][];
}

const RowDetailsTable: React.FC<Props> = ({ columns, rows }) => (
  <div className="border border-base-13 rounded-[8px] w-full overflow-hidden">
    <table className="w-full border-collapse">
      <thead>
        <tr>
          {columns.map((col) => (
            <th
              key={col.id}
              className={`bg-base-20 border border-base-14 px-2 py-1.5 text-[11px] font-bold text-base-06 ${col.align === 'left' ? 'text-left' : 'text-center'}`}
            >
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIdx) => (
          <tr
            key={rowIdx}
            className={rowIdx < rows.length - 1 ? 'border-b border-base-13' : ''}
          >
            {row.map((cell, colIdx) => (
              <td
                key={columns[colIdx].id}
                className={`bg-base-20 h-9 px-2 text-[12px] text-base-06 ${columns[colIdx].align === 'left' ? 'text-left' : 'text-center'}`}
              >
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default RowDetailsTable;
