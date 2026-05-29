interface Column<T> {
  header: string
  render: (row: T) => React.ReactNode
  className?: string
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
}

export default function DataTable<T>({
  data,
  columns,
}: DataTableProps<T>) {
  return (
    <div className="max-h-96 overflow-auto border rounded-lg">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 sticky top-0">
          <tr>
            {columns.map((col, i) => (
              <th
                key={i}
                className={`p-3 text-left ${col.className || ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {data.map((row, i) => (
            <tr
              key={i}
              className="border-t hover:bg-gray-50 transition"
            >
              {columns.map((col, j) => (
                <td key={j} className="p-3">
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
