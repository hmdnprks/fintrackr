import { formatIDR } from '@/lib/formatter'
import type { MonthComparisonData } from '@/hooks/useMonthComparison'

interface Props {
  comparison: MonthComparisonData
}

const BIG_CHANGE = 30

export default function MonthComparisonSection({ comparison }: Props) {
  if (!comparison.hasPrevData) {
    return (
      <div className="bg-white rounded-2xl shadow-sm px-6 py-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Month Comparison</h2>
        <p className="text-sm text-gray-400">
          No data for {comparison.prevMonthLabel} — import two consecutive months to see comparisons.
        </p>
      </div>
    )
  }

  const { prevMonthLabel, categoryChanges } = comparison

  // Show expense categories only, same scope as CategorySection
  const expenseChanges = categoryChanges.filter(
    (c) => c.category !== 'Income' && c.category !== 'Transfer'
  )

  const maxAmount = Math.max(...expenseChanges.map((c) => Math.max(c.current, c.prev)), 1)

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Month Comparison</h2>
          <p className="text-sm text-gray-400 mt-0.5">Spending vs {prevMonthLabel}</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-1.5 rounded-full bg-gray-200" />
            <span>{prevMonthLabel}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-1.5 rounded-full bg-blue-400" />
            <span>This month</span>
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-50">
        {expenseChanges.map((item) => {
          const isIncrease = item.delta > 0
          const isNew      = item.prev === 0
          const isGone     = item.current === 0
          const isBig      = item.pct !== null && Math.abs(item.pct) >= BIG_CHANGE
          const prevWidth  = `${(item.prev    / maxAmount) * 100}%`
          const currWidth  = `${(item.current / maxAmount) * 100}%`

          return (
            <div key={item.category} className="px-6 py-3.5 space-y-1.5">
              {/* Row header */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">{item.category}</span>
                <div className="flex items-center gap-3">
                  {/* Amounts */}
                  {!isNew && !isGone && (
                    <span className="text-xs text-gray-400 tabular-nums">
                      {formatIDR(item.prev)}
                      <span className="mx-1.5 text-gray-300">→</span>
                      <span className={`font-medium ${isIncrease ? 'text-gray-700' : 'text-gray-700'}`}>
                        {formatIDR(item.current)}
                      </span>
                    </span>
                  )}
                  {isNew && (
                    <span className="text-xs text-gray-400 tabular-nums">
                      —<span className="mx-1.5 text-gray-300">→</span>
                      <span className="font-medium text-gray-700">{formatIDR(item.current)}</span>
                    </span>
                  )}
                  {isGone && (
                    <span className="text-xs text-gray-400 tabular-nums">
                      {formatIDR(item.prev)}<span className="mx-1.5 text-gray-300">→</span>—
                    </span>
                  )}

                  {/* Delta badge */}
                  {isNew ? (
                    <span className="text-xs font-medium bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full w-14 text-center">New</span>
                  ) : isGone ? (
                    <span className="text-xs font-medium bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full w-14 text-center">Gone</span>
                  ) : item.pct !== null ? (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full w-14 text-center ${
                      isBig && isIncrease ? 'bg-amber-50 text-amber-600'
                      : isIncrease        ? 'bg-red-50 text-red-500'
                      :                     'bg-green-50 text-green-600'
                    }`}>
                      {isIncrease ? '↑' : '↓'} {Math.abs(item.pct).toFixed(0)}%
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Dual bar */}
              <div className="space-y-1">
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gray-300 rounded-full transition-all duration-500"
                    style={{ width: prevWidth }} />
                </div>
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isBig && isIncrease ? 'bg-amber-400' : 'bg-blue-400'
                    }`}
                    style={{ width: currWidth }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
