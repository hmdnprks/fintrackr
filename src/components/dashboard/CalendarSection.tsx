/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { formatIDR } from '@/lib/formatter'

const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const CATEGORIES = [
  'Income', 'Food & Dining', 'Groceries', 'Shopping', 'Services',
  'Transportation', 'Health & Medical', 'Entertainment', 'Education',
  'Housing', 'Insurance', 'Bank Charges', 'Transfer', 'Uncategorized',
]

const CATEGORY_COLORS: Record<string, string> = {
  'Income':           'bg-green-100 text-green-700',
  'Food & Dining':    'bg-orange-100 text-orange-700',
  'Groceries':        'bg-lime-100 text-lime-700',
  'Shopping':         'bg-pink-100 text-pink-700',
  'Services':         'bg-blue-100 text-blue-700',
  'Transportation':   'bg-sky-100 text-sky-700',
  'Health & Medical': 'bg-red-100 text-red-700',
  'Entertainment':    'bg-purple-100 text-purple-700',
  'Education':        'bg-indigo-100 text-indigo-700',
  'Housing':          'bg-amber-100 text-amber-700',
  'Insurance':        'bg-teal-100 text-teal-700',
  'Bank Charges':     'bg-gray-100 text-gray-600',
  'Transfer':         'bg-slate-100 text-slate-600',
  'Uncategorized':    'bg-amber-50 text-amber-600',
}

function heatColor(amount: number, max: number): string {
  if (amount === 0 || max === 0) return ''
  // Apply sqrt curve so small amounts still show visible color
  const t = Math.sqrt(Math.min(amount / max, 1))
  // Warm scale: light amber → orange → deep red
  const r = Math.round(254 - t * 55)
  const g = Math.round(215 - t * 190)
  const b = Math.round(170 - t * 165)
  return `rgb(${r},${g},${b})`
}

function isDarkCell(amount: number, max: number): boolean {
  return max > 0 && amount / max > 0.45
}

function abbreviate(n: number): string {
  if (n === 0) return ''
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  return `${Math.round(n / 1_000)}K`
}

interface Props {
  allTransactions: any[]
  selectedMonth: string  // "YYYY-MM"
  onRecategorize: (txIndex: number, newCategory: string) => void
}

export default function CalendarSection({ allTransactions, selectedMonth, onRecategorize }: Props) {
  const [selectedDay, setSelectedDay]     = useState<number | null>(null)
  const [editingIdx, setEditingIdx]       = useState<number | null>(null)
  const selectRef = useRef<HTMLSelectElement>(null)

  useEffect(() => {
    if (editingIdx !== null) selectRef.current?.focus()
  }, [editingIdx])

  // Clear editing state when day changes
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setEditingIdx(null) }, [selectedDay])

  const [year, month] = selectedMonth.split('-').map(Number)
  const monthLabel = new Date(year, month - 1).toLocaleString('en-US', {
    month: 'long', year: 'numeric',
  })
  const daysInMonth   = new Date(year, month, 0).getDate()
  // Mon-first: Sun(0)→6, Mon(1)→0, Sat(6)→5
  const firstDayOffset = (new Date(year, month - 1, 1).getDay() + 6) % 7

  // Aggregate by calendar day — store original index for recategorization
  const byDay = useMemo(() => {
    const map: Record<number, { spending: number; income: number; txs: { tx: any; originalIdx: number }[] }> = {}
    allTransactions.forEach((tx: any, originalIdx: number) => {
      if (!tx.fullDate) return
      const d = (tx.fullDate as Date).getDate()
      if (!map[d]) map[d] = { spending: 0, income: 0, txs: [] }
      if (tx.type === 'debit') map[d].spending += tx.amount || 0
      else                     map[d].income   += tx.amount || 0
      map[d].txs.push({ tx, originalIdx })
    })
    return map
  }, [allTransactions])

  const maxSpending  = Math.max(...Object.values(byDay).map((d) => d.spending), 1)
  const activeDays   = Object.values(byDay).filter((d) => d.spending > 0).length
  const totalSpend   = Object.values(byDay).reduce((s, d) => s + d.spending, 0)
  const avgPerActive = activeDays > 0 ? totalSpend / activeDays : 0
  const busiestEntry = Object.entries(byDay).sort((a, b) => b[1].spending - a[1].spending)[0]
  const busiestDay   = busiestEntry ? Number(busiestEntry[0]) : null

  // Build flat cell list (null = empty padding)
  const cells: (number | null)[] = [
    ...Array(firstDayOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const selectedData = selectedDay ? byDay[selectedDay] : null

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">

      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Daily Spending</h2>
          <p className="text-sm text-gray-400 mt-0.5">{monthLabel}</p>
        </div>
        <div className="flex items-center gap-6 text-right">
          {avgPerActive > 0 && (
            <div>
              <p className="text-xs text-gray-400">Avg per active day</p>
              <p className="text-sm font-semibold text-gray-800">{formatIDR(avgPerActive)}</p>
            </div>
          )}
          {busiestDay && (
            <div>
              <p className="text-xs text-gray-400">Busiest day</p>
              <p className="text-sm font-semibold text-gray-800">
                {new Date(year, month - 1, busiestDay).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric',
                })}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Calendar grid */}
      <div className="px-6 pt-5 pb-4">

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1.5 mb-1.5">
          {DAY_HEADERS.map((d, i) => (
            <div
              key={d}
              className={`text-center text-xs font-semibold py-1 ${
                i >= 5 ? 'text-gray-400' : 'text-gray-400'
              }`}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((day, i) => {
            if (!day) return <div key={`empty-${i}`} className="h-10 sm:h-14" />

            const data     = byDay[day]
            const spending = data?.spending || 0
            const hasIncome = (data?.income || 0) > 0
            const color    = heatColor(spending, maxSpending)
            const dark     = isDarkCell(spending, maxSpending)
            const isSelected = selectedDay === day
            const isWeekend = ((firstDayOffset + day - 1) % 7) >= 5
            const isToday   = new Date().getFullYear() === year &&
                              new Date().getMonth() + 1 === month &&
                              new Date().getDate() === day

            return (
              <button
                key={day}
                onClick={() => setSelectedDay(isSelected ? null : day)}
                title={spending > 0 ? formatIDR(spending) : undefined}
                className={`
                  h-10 sm:h-14 rounded-xl flex flex-col items-center justify-center gap-0.5
                  relative transition-all duration-150 border-2
                  ${isSelected
                    ? 'border-blue-500 scale-105 shadow-md'
                    : 'border-transparent hover:border-gray-300 hover:scale-105'}
                  ${spending === 0
                    ? isWeekend
                      ? 'bg-gray-100 hover:bg-gray-150'
                      : 'bg-gray-50 hover:bg-gray-100'
                    : 'hover:opacity-90'}
                `}
                style={{ backgroundColor: color || undefined }}
              >
                {/* Day number */}
                <span className={`text-xs font-semibold leading-none ${
                  dark ? 'text-white' : isWeekend ? 'text-gray-500' : 'text-gray-700'
                }`}>
                  {day}
                </span>

                {/* Spending amount */}
                {spending > 0 && (
                  <span className={`text-xs leading-none font-medium ${
                    dark ? 'text-white/80' : 'text-gray-600'
                  }`}>
                    {abbreviate(spending)}
                  </span>
                )}

                {/* Today indicator */}
                {isToday && (
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-500" />
                )}

                {/* Income dot */}
                {hasIncome && (
                  <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-green-400 border border-white" />
                )}
              </button>
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-end gap-2 mt-4">
          <span className="text-xs text-gray-400">Low</span>
          {[0.15, 0.35, 0.55, 0.75, 1.0].map((t) => (
            <div
              key={t}
              className="w-4 h-4 rounded-md border border-black/5"
              style={{ backgroundColor: heatColor(t * maxSpending, maxSpending) }}
            />
          ))}
          <span className="text-xs text-gray-400">High</span>
          <div className="w-3" />
          <div className="w-3 h-3 rounded-full bg-green-400 border border-white shadow-sm" />
          <span className="text-xs text-gray-400">Income</span>
          <div className="w-3" />
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-xs text-gray-400">Today</span>
        </div>
      </div>

      {/* Selected day detail panel */}
      {selectedDay && selectedData && (
        <div className="border-t border-gray-100 bg-gray-50 px-6 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {new Date(year, month - 1, selectedDay).toLocaleDateString('en-US', {
                  weekday: 'long', month: 'long', day: 'numeric',
                })}
              </p>
              <div className="flex items-center gap-3 mt-0.5">
                {selectedData.spending > 0 && (
                  <span className="text-xs text-red-500 font-medium">
                    −{formatIDR(selectedData.spending)} spent
                  </span>
                )}
                {selectedData.income > 0 && (
                  <span className="text-xs text-green-600 font-medium">
                    +{formatIDR(selectedData.income)} received
                  </span>
                )}
                <span className="text-xs text-gray-400">
                  {selectedData.txs.length} transaction{selectedData.txs.length !== 1 ? 's' : ''} — click a category to change it
                </span>
              </div>
            </div>
            <button
              onClick={() => setSelectedDay(null)}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="bg-white rounded-xl overflow-hidden border border-gray-100">
            {[...selectedData.txs]
              .sort((a, b) => b.tx.amount - a.tx.amount)
              .map(({ tx, originalIdx }) => {
                const isEditing = editingIdx === originalIdx
                const colorClass = CATEGORY_COLORS[tx.category] ?? CATEGORY_COLORS['Uncategorized']
                return (
                  <div
                    key={originalIdx}
                    className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0"
                    onClick={() => setEditingIdx(null)}
                  >
                    <span className={`text-sm font-semibold tabular-nums shrink-0 ${
                      tx.type === 'credit' ? 'text-green-600' : 'text-red-500'
                    }`}>
                      {tx.type === 'credit' ? '+' : '−'}{formatIDR(tx.amount)}
                    </span>

                    <span className="flex-1 text-sm text-gray-700 truncate">{tx.detail}</span>

                    {/* Editable category */}
                    <div onClick={(e) => e.stopPropagation()}>
                      {isEditing ? (
                        <select
                          ref={selectRef}
                          defaultValue={tx.category || 'Uncategorized'}
                          onChange={(e) => {
                            onRecategorize(originalIdx, e.target.value)
                            setEditingIdx(null)
                          }}
                          onBlur={() => setEditingIdx(null)}
                          className="text-xs border border-blue-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      ) : (
                        <button
                          onClick={() => setEditingIdx(originalIdx)}
                          title="Click to change category"
                          className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full transition hover:opacity-80 ${colorClass}`}
                        >
                          {tx.category || 'Uncategorized'}
                          <svg className="w-3 h-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}
