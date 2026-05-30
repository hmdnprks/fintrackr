/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useMemo } from 'react'

interface Props {
  statements: any[]
  selectedYear: string
  selectedMonth: string
}

const EXCLUDE_FROM_EXPENSE = new Set(['Transfer', 'Bank Charges', 'Loan'])

function formatIDR(n: number) {
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}jt`
  if (n >= 1_000)     return `Rp ${Math.round(n / 1_000)}rb`
  return `Rp ${Math.round(n).toLocaleString('id-ID')}`
}

function pctChange(current: number, prev: number): number | null {
  if (!prev) return null
  return Math.round(((current - prev) / prev) * 100)
}

function DeltaBadge({ pct, inverse = false }: { pct: number | null; inverse?: boolean }) {
  if (pct === null) return <span className="text-xs text-gray-400">—</span>
  const up = pct > 0
  // For expenses, up = bad (inverse); for income/net, up = good
  const good = inverse ? !up : up
  const color = pct === 0 ? 'text-gray-400' : good ? 'text-green-600 dark:text-green-400' : 'text-red-500'
  return (
    <span className={`text-xs font-semibold ${color}`}>
      {pct > 0 ? '+' : ''}{pct}%
    </span>
  )
}

function buildPeriodTotals(statements: any[], keys: string[]) {
  const keySet = new Set(keys)
  let income = 0, expense = 0
  const byCat: Record<string, number> = {}

  for (const s of statements) {
    if (!keySet.has(s.monthKey)) continue
    for (const tx of s.transactions || []) {
      const amt = tx.amount || 0
      if (tx.type === 'credit') { income += amt; continue }
      if (EXCLUDE_FROM_EXPENSE.has(tx.category)) continue
      expense += amt
      const cat = tx.category || 'Uncategorized'
      byCat[cat] = (byCat[cat] || 0) + amt
    }
  }
  return { income, expense, net: income - expense, byCat }
}

export default function YearOverYearSection({ statements, selectedYear, selectedMonth }: Props) {
  const data = useMemo(() => {
    if (!statements.length) return null

    const allKeys = [...new Set(statements.map((s: any) => s.monthKey).filter(Boolean))]

    let currKeys: string[], prevKeys: string[], currLabel: string, prevLabel: string

    if (selectedMonth !== 'all') {
      // Specific month selected → compare same month YoY
      const [y, mo] = selectedMonth.split('-')
      const prevMonthKey = `${parseInt(y) - 1}-${mo}`
      currKeys = [selectedMonth]
      prevKeys = [prevMonthKey]
      const d = new Date(parseInt(y), parseInt(mo) - 1)
      currLabel = d.toLocaleString('en-US', { month: 'short', year: 'numeric' })
      prevLabel = new Date(parseInt(y) - 1, parseInt(mo) - 1).toLocaleString('en-US', { month: 'short', year: 'numeric' })
    } else if (selectedYear !== 'all') {
      // Year selected → compare this year vs last year (same months only)
      const yr = parseInt(selectedYear)
      currKeys = allKeys.filter(k => k.startsWith(String(yr)))
      // Only compare months from previous year that exist in current year
      const currMonths = new Set(currKeys.map(k => k.slice(5)))  // MM part
      prevKeys = allKeys.filter(k => k.startsWith(String(yr - 1)) && currMonths.has(k.slice(5)))
      currLabel = String(yr)
      prevLabel = String(yr - 1)
    } else {
      // All time → compare most recent complete year vs the one before
      const years = [...new Set(allKeys.map(k => k.slice(0, 4)))].sort().reverse()
      if (years.length < 2) return null
      const [y1, y2] = years
      currKeys = allKeys.filter(k => k.startsWith(y1))
      const currMonths = new Set(currKeys.map(k => k.slice(5)))
      prevKeys = allKeys.filter(k => k.startsWith(y2) && currMonths.has(k.slice(5)))
      currLabel = y1
      prevLabel = y2
    }

    if (!currKeys.length || !prevKeys.length) return null

    const curr = buildPeriodTotals(statements, currKeys)
    const prev = buildPeriodTotals(statements, prevKeys)

    // Top categories by current spend, with YoY delta
    const topCats = Object.entries(curr.byCat)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([cat, amt]) => ({
        cat,
        curr: amt,
        prev: prev.byCat[cat] || 0,
        pct:  pctChange(amt, prev.byCat[cat] || 0),
      }))

    return { curr, prev, currLabel, prevLabel, topCats }
  }, [statements, selectedYear, selectedMonth])

  if (!data) return null

  const { curr, prev, currLabel, prevLabel, topCats } = data

  return (
    <div className="bg-white dark:bg-gray-900 dark:border dark:border-gray-800 p-6 rounded-2xl shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Year-over-Year</h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
          <span className="font-medium text-gray-700 dark:text-gray-300">{currLabel}</span>
          {' '}vs{' '}
          <span className="font-medium text-gray-500 dark:text-gray-400">{prevLabel}</span>
        </p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Income',   curr: curr.income,  prev: prev.income,  color: 'text-green-600 dark:text-green-400', inverse: false },
          { label: 'Expenses', curr: curr.expense, prev: prev.expense, color: 'text-red-500',                        inverse: true  },
          { label: 'Net',      curr: curr.net,     prev: prev.net,     color: curr.net >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-500', inverse: false },
        ].map(({ label, curr: c, prev: p, color, inverse }) => (
          <div key={label} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{label}</p>
            <p className={`text-sm font-bold ${color}`}>{formatIDR(c)}</p>
            <DeltaBadge pct={pctChange(c, p)} inverse={inverse} />
          </div>
        ))}
      </div>

      {/* Top category breakdown */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Top categories</p>
        {topCats.map(({ cat, curr: c, prev: p, pct }) => {
          const maxAmt = Math.max(c, p, 1)
          return (
            <div key={cat}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-700 dark:text-gray-300 font-medium">{cat}</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 dark:text-gray-500">{prevLabel}: {formatIDR(p)}</span>
                  <span className="text-gray-700 dark:text-gray-200 font-semibold">{formatIDR(c)}</span>
                  <DeltaBadge pct={pct} inverse={true} />
                </div>
              </div>
              <div className="flex gap-1 h-1.5">
                <div className="bg-gray-200 dark:bg-gray-700 rounded-full" style={{ width: `${(p / maxAmt) * 100}%` }} />
              </div>
              <div className="flex gap-1 h-1.5 mt-0.5">
                <div className="bg-blue-400 rounded-full" style={{ width: `${(c / maxAmt) * 100}%` }} />
              </div>
            </div>
          )
        })}
        <div className="flex items-center gap-3 pt-1 text-xs text-gray-400 dark:text-gray-500">
          <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded bg-gray-200 dark:bg-gray-700 inline-block" /> {prevLabel}</span>
          <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded bg-blue-400 inline-block" /> {currLabel}</span>
        </div>
      </div>
    </div>
  )
}
