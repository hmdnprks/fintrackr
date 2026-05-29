/* eslint-disable @typescript-eslint/no-explicit-any */
import DataTable from '@/components/ui/DataTable'
import RecurringSuggestionPanel from './RecurringSuggestionPanel'
import { formatIDR } from '@/lib/formatter'

interface Props {
  transactions: any[]
  recurringSuggestions: any[]
}

export default function TransactionSection({
  transactions,
  recurringSuggestions,
}: Props) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm">
      <h2 className="text-lg font-semibold mb-6">
        Transactions ({transactions.length})
      </h2>

      <RecurringSuggestionPanel
        suggestions={recurringSuggestions}
        formatIDR={formatIDR}
      />

      <DataTable
        data={transactions}
        columns={[
          {
            header: 'Date',
            render: (tx) =>
              tx.fullDate?.toLocaleDateString('id-ID'),
          },
          {
            header: 'Detail',
            render: (tx) => tx.detail,
          },
          {
            header: 'Amount',
            render: (tx) => formatIDR(tx.amount),
            className: 'text-right',
          },
          {
            header: 'Category',
            render: (tx) => tx.category,
          },
        ]}
      />
    </div>
  )
}
