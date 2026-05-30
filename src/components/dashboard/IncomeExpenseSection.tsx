import { formatIDR } from '@/lib/formatter'

interface Props {
  income: number
  expense: number
  avgDailyExpense?: number
}

export default function IncomeExpenseSection({ income, expense, avgDailyExpense = 0 }: Props) {
  const net         = income - expense
  const isPositive  = net >= 0
  const max         = Math.max(income, expense, 1)
  const savingsRate = income > 0 ? Math.round((net / income) * 100) : 0

  return (
    <div className="bg-white dark:bg-gray-900 dark:border dark:border-gray-800 rounded-2xl shadow-sm px-6 py-5">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Income vs Expense</h2>
        <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
          isPositive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
        }`}>
          {isPositive ? `Saved ${savingsRate}%` : `Over by ${Math.abs(savingsRate)}%`}
        </span>
      </div>

      <div className="space-y-3">
        {/* Income bar */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 dark:text-gray-400 w-16 shrink-0">Income</span>
          <div className="flex-1 h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-500"
              style={{ width: `${(income / max) * 100}%` }}
            />
          </div>
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200 w-32 text-right shrink-0 tabular-nums">
            {formatIDR(income)}
          </span>
        </div>

        {/* Expense bar */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 dark:text-gray-400 w-16 shrink-0">Expense</span>
          <div className="flex-1 h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-400 rounded-full transition-all duration-500"
              style={{ width: `${(expense / max) * 100}%` }}
            />
          </div>
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200 w-32 text-right shrink-0 tabular-nums">
            {formatIDR(expense)}
          </span>
        </div>

        {/* Net bar */}
        <div className="flex items-center gap-3 pt-1 border-t border-gray-100 dark:border-gray-800 mt-1">
          <span className="text-xs text-gray-500 dark:text-gray-400 w-16 shrink-0">Net</span>
          <div className="flex-1 h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${isPositive ? 'bg-blue-400' : 'bg-red-500'}`}
              style={{ width: `${(Math.abs(net) / max) * 100}%` }}
            />
          </div>
          <span className={`text-sm font-semibold w-32 text-right shrink-0 tabular-nums ${
            isPositive ? 'text-gray-800 dark:text-gray-200' : 'text-red-500'
          }`}>
            {isPositive ? '+' : '−'}{formatIDR(Math.abs(net))}
          </span>
        </div>
      </div>

      {avgDailyExpense > 0 && (
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400 dark:text-gray-500">🔥 Burn rate</span>
            <span className="text-xs text-gray-300 dark:text-gray-600">·</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">avg daily spend this period</span>
          </div>
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 tabular-nums">
            {formatIDR(avgDailyExpense)}<span className="text-xs font-normal text-gray-400">/day</span>
          </span>
        </div>
      )}
    </div>
  )
}
