/* eslint-disable @typescript-eslint/no-explicit-any */
export function downloadCSV(
  transactions: any[],
  filename = 'transactions.csv'
) {
  const headers = ['Date', 'Description', 'Amount', 'Type', 'Category']
  const rows = transactions.map((tx: any) => [
    tx.fullDate ? tx.fullDate.toLocaleDateString('id-ID') : '',
    `"${(tx.detail || '').replace(/"/g, '""')}"`,
    tx.amount || 0,
    tx.type || '',
    tx.category || 'Uncategorized',
  ])

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join(
    '\n'
  )

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
