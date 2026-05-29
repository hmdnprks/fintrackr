/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useMemo } from 'react'
import { formatIDR } from '@/lib/formatter'

const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

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
}

export default function CalendarSection({ allTransactions, selectedMonth }: Props) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  const [year, month] = selectedMonth.split('-').map(Number)
  const monthLabel = new Date(year, month - 1).toLocaleString('en-US', {
    month: 'long', year: 'numeric',
  })
  const daysInMonth   = new Date(year, month, 0).getDate()
  // Mon-first: Sun(0)→6, Mon(1)→0, Sat(6)→5
  const firstDayOffset = (new Date(year, month - 1, 1).getDay() + 6) % 7

  // Aggregate by calendar day
  const byDay = useMemo(() => {
    const map: Record<number, { spending: number; income: number; txs: any[] }> = {}
    for (const tx of allTransactions) {
      if (!tx.fullDate) continue
      const d = (tx.fullDate as Date).getDate()
      if (!map[d]) map[d] = { spending: 0, income: 0, txs: [] }
      if (tx.type === 'debit') map[d].spending += tx.amount || 0
      else                     map[d].income   += tx.amount || 0
      map[d].txs.push(tx)
    }
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
            if (!day) return <div key={`empty-${i}`} className="h-14" />

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
                  h-14 rounded-xl flex flex-col items-center justify-center gap-0.5
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
                  {selectedData.txs.length} transaction{selectedData.txs.length !== 1 ? 's' : ''}
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
              .sort((a, b) => b.amount - a.amount)
              .map((tx: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0"
                >
                  <span className={`text-sm font-semibold tabular-nums shrink-0 ${
                    tx.type === 'credit' ? 'text-green-600' : 'text-red-500'
                  }`}>
                    {tx.type === 'credit' ? '+' : '−'}{formatIDR(tx.amount)}
                  </span>
                  <span className="flex-1 text-sm text-gray-700 truncate">{tx.detail}</span>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full shrink-0">
                    {tx.category || 'Uncategorized'}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
