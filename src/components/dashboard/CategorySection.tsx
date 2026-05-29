/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useMemo } from 'react'
import '@/lib/chartjs'
import { Pie } from 'react-chartjs-2'
import { formatIDR } from '@/lib/formatter'

const CATEGORY_COLOR: Record<string, string> = {
  'Income':           '#22c55e',
  'Food & Dining':    '#f97316',
  'Groceries':        '#84cc16',
  'Shopping':         '#ec4899',
  'Services':         '#3b82f6',
  'Transportation':   '#0ea5e9',
  'Health & Medical': '#ef4444',
  'Entertainment':    '#a855f7',
  'Education':        '#6366f1',
  'Housing':          '#f59e0b',
  'Insurance':        '#14b8a6',
  'Bank Charges':     '#6b7280',
  'Transfer':         '#94a3b8',
  'Uncategorized':    '#fbbf24',
}

type Filter = 'expense' | 'income'

interface Props {
  allTransactions: any[]
}

export default function CategorySection({ allTransactions }: Props) {
  const [filter, setFilter] = useState<Filter>('expense')

  const { entries, total } = useMemo(() => {
    const map: Record<string, number> = {}
    for (const tx of allTransactions) {
      if (filter === 'expense' && tx.type !== 'debit')  continue
      if (filter === 'income'  && tx.type !== 'credit') continue
      const cat = tx.category || 'Uncategorized'
      map[cat] = (map[cat] || 0) + (tx.amount || 0)
    }
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1])
    const total  = sorted.reduce((s, [, v]) => s + v, 0)
    return { entries: sorted, total }
  }, [allTransactions, filter])

  const chartData = {
    labels: entries.map(([cat]) => cat),
    datasets: [{
      data: entries.map(([, v]) => v),
      backgroundColor: entries.map(([cat]) => CATEGORY_COLOR[cat] ?? '#94a3b8'),
      borderWidth: 2,
      borderColor: '#fff',
    }],
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">
          {filter === 'expense' ? 'Spending' : 'Income'} by Category
        </h2>
        <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5">
          {(['expense', 'income'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium transition ${
                filter === f
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {f === 'expense' ? '↓ Expenses' : '↑ Income'}
            </button>
          ))}
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-gray-400">
            No {filter === 'expense' ? 'expense' : 'income'} data for this period.
          </p>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row">

          {/* Donut chart */}
          <div className="md:w-56 shrink-0 flex items-center justify-center p-8">
            <div className="relative w-40 h-40">
              <Pie
                data={chartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  cutout: '68%',
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: (ctx: any) => {
                          const pct = total > 0
                            ? ((ctx.raw / total) * 100).toFixed(1)
                            : '0'
                          return ` ${formatIDR(ctx.raw)} (${pct}%)`
                        },
                      },
                    },
                  },
                }}
              />
              {/* Center total */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-xs text-gray-400 mb-0.5">
                  {filter === 'expense' ? 'Total spent' : 'Total earned'}
                </p>
                <p className="text-sm font-bold text-gray-800 text-center leading-tight px-2">
                  {formatIDR(total)}
                </p>
              </div>
            </div>
          </div>

          {/* Ranked list */}
          <div className="flex-1 border-t md:border-t-0 md:border-l border-gray-100 divide-y divide-gray-50">
            {entries.map(([cat, amount], i) => {
              const pct   = total > 0 ? (amount / total) * 100 : 0
              const color = CATEGORY_COLOR[cat] ?? '#94a3b8'
              return (
                <div key={cat} className="flex items-center gap-3 px-5 py-3">
                  <span className="text-xs text-gray-300 w-4 text-right shrink-0 tabular-nums">
                    {i + 1}
                  </span>
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-sm text-gray-700 w-36 shrink-0 truncate">{cat}</span>
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-800 w-28 text-right shrink-0 tabular-nums">
                    {formatIDR(amount)}
                  </span>
                  <span className="text-xs text-gray-400 w-10 text-right shrink-0 tabular-nums">
                    {pct.toFixed(1)}%
                  </span>
                </div>
              )
            })}
          </div>

        </div>
      )}
    </div>
  )
}
