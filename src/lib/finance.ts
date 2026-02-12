/* eslint-disable @typescript-eslint/no-explicit-any */
export function aggregateTransactions(statements: any[]) {
  const allTransactions = statements.flatMap(
    (s) => s.transactions || []
  )

  const totalIncome = allTransactions
    .filter((t) => t.type === 'credit')
    .reduce((sum, t) => sum + (t.amount || 0), 0)

  const totalExpense = allTransactions
    .filter((t) => t.type === 'debit')
    .reduce((sum, t) => sum + (t.amount || 0), 0)

  return {
    transactions: allTransactions,
    totalIncome,
    totalExpense,
  }
}
