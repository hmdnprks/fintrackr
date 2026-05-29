export function parseTransactionDate(
  txDate: string,
  monthDate: Date
) {
  const [day, month] = txDate.split('/')
  return new Date(
    monthDate.getFullYear(),
    Number(month) - 1,
    Number(day)
  )
}

export function formatIDR(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount)
}