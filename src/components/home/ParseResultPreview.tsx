/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { formatIDR } from '@/lib/formatter'

const CATEGORY_COLOR: Record<string, string> = {
  'Income': '#22c55e',
  'Food & Dining': '#f97316',
  'Groceries': '#84cc16',
  'Shopping': '#ec4899',
  'Services': '#3b82f6',
  'Transportation': '#0ea5e9',
  'Health & Medical': '#ef4444',
  'Entertainment': '#a855f7',
  'Education': '#6366f1',
  'Housing': '#f59e0b',
  'Insurance': '#14b8a6',
  'Bank Charges': '#6b7280',
  'Transfer': '#94a3b8',
  'Uncategorized': '#fbbf24',
}

function extractMonthKey(period: string): string | null {
  const match = period?.match(/\/(\d{2})\/(\d{2})/)
  if (!match) return null
  return `20${match[2]}-${match[1]}`
}

type ParseResultPreviewProps = {
  result: any
  saved: boolean
  showDupWarning: boolean
  onSave: (force?: boolean) => void
  onCancelDup: () => void
}

export default function ParseResultPreview({
  result,
  saved,
  showDupWarning,
  onSave,
  onCancelDup
}: ParseResultPreviewProps) {
  const totalIncome = useMemo(() =>
    result?.transactions?.filter((t: any) => t.type === 'credit')
      .reduce((s: number, t: any) => s + (t.amount ?? 0), 0) ?? 0,
    [result]
  )

  const totalExpense = useMemo(() =>
    result?.transactions?.filter((t: any) => t.type === 'debit')
      .reduce((s: number, t: any) => s + (t.amount ?? 0), 0) ?? 0,
    [result]
  )

  const net = totalIncome - totalExpense
  const max = Math.max(totalIncome, totalExpense, 1)
  const savingsRate = totalIncome > 0 ? Math.round((net / totalIncome) * 100) : 0

  const categoryEntries = useMemo(() => {
    if (!result?.transactions) return []
    const map: Record<string, number> = {}
    result.transactions
      .filter((t: any) => t.type === 'debit')
      .forEach((t: any) => {
        const cat = t.category ?? 'Uncategorized'
        map[cat] = (map[cat] ?? 0) + (t.amount ?? 0)
      })
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1])
    const total = sorted.reduce((s, [, v]) => s + v, 0)
    return sorted.map(([cat, amt]) => ({
      cat, amt,
      pct: total > 0 ? (amt / total) * 100 : 0,
    }))
  }, [result])

  const parsedPeriod = result?.accountSummary?.period
    ? (() => {
      const mk = extractMonthKey(result.accountSummary.period)
      if (!mk) return null
      const [y, m] = mk.split('-').map(Number)
      return new Date(y, m - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })
    })()
    : null

  return (
    <div className="space-y-6">
      {/* Save action card */}
      {saved ? (
        <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-2xl px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-green-800">Statement saved</p>
              <p className="text-xs text-green-600">
                {parsedPeriod} · {result.transactions.length} transactions
              </p>
            </div>
          </div>
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-sm font-semibold text-green-700 hover:text-green-900 transition"
          >
            View Dashboard
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {parsedPeriod ?? 'Statement parsed'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {result.transactions.length} transactions · review below before saving
            </p>
          </div>
          <button
            onClick={() => onSave()}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Save to Dashboard
          </button>
        </div>
      )}

      {/* Duplicate warning */}
      {showDupWarning && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-amber-800">Already imported</p>
              <p className="text-xs text-amber-700 mt-0.5">
                {parsedPeriod} is already in your dashboard. Saving again will create a duplicate.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onCancelDup}
              className="text-sm text-amber-700 hover:text-amber-900 px-3 py-1.5"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(true)}
              className="text-sm font-medium bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-xl transition"
            >
              Save anyway
            </button>
          </div>
        </div>
      )}

      {/* Account summary */}
      <div className="bg-white rounded-2xl shadow-sm px-6 py-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Account Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {[
            { label: 'Account', value: result.accountSummary.accountNumber },
            { label: 'Product', value: result.accountSummary.productName },
            { label: 'Period', value: result.accountSummary.period },
            { label: 'Balance', value: formatIDR(result.accountSummary.balance), highlight: true },
          ].map(({ label, value, highlight }) => (
            <div key={label}>
              <p className="text-xs text-gray-400 mb-0.5">{label}</p>
              <p className={`font-medium ${highlight ? 'text-blue-600' : 'text-gray-800'}`}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Income vs Expense */}
      <div className="bg-white rounded-2xl shadow-sm px-6 py-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-900">Income vs Expense</h2>
          <span className={`text-sm font-semibold px-3 py-1 rounded-full ${net >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
            }`}>
            {net >= 0 ? `Saved ${savingsRate}%` : `Over by ${Math.abs(savingsRate)}%`}
          </span>
        </div>
        <div className="space-y-3">
          {[
            { label: 'Income', value: totalIncome, color: 'bg-green-500', textColor: 'text-gray-800' },
            { label: 'Expense', value: totalExpense, color: 'bg-red-400', textColor: 'text-gray-800' },
            { label: 'Net', value: Math.abs(net), color: net >= 0 ? 'bg-blue-400' : 'bg-red-500', textColor: net >= 0 ? 'text-gray-800' : 'text-red-500' },
          ].map(({ label, value, color, textColor }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="text-xs text-gray-500 w-14 shrink-0">{label}</span>
              <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full ${color} rounded-full transition-all duration-500`}
                  style={{ width: `${(value / max) * 100}%` }} />
              </div>
              <span className={`text-sm font-medium w-32 text-right shrink-0 tabular-nums ${textColor}`}>
                {label === 'Net' ? (net >= 0 ? '+' : '−') : ''}{formatIDR(value)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Category breakdown */}
      {categoryEntries.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">Spending by Category</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {categoryEntries.map(({ cat, amt, pct }, i) => {
              const color = CATEGORY_COLOR[cat] ?? '#94a3b8'
              return (
                <div key={cat} className="flex items-center gap-3 px-6 py-3">
                  <span className="text-xs text-gray-300 w-4 text-right shrink-0 tabular-nums">{i + 1}</span>
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-sm text-gray-700 w-36 shrink-0 truncate">{cat}</span>
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                  </div>
                  <span className="text-sm font-medium text-gray-800 w-28 text-right shrink-0 tabular-nums">
                    {formatIDR(amt)}
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

      {/* Transactions */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            Transactions
            <span className="text-sm font-normal text-gray-400 ml-2">
              {result.transactions.length}
            </span>
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-6 py-3 w-20">Date</th>
              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-6 py-3">Description</th>
              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-6 py-3 w-36">Category</th>
              <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wide px-6 py-3 w-32">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {result.transactions.map((tx: any, i: number) => (
              <tr key={i} className="hover:bg-gray-50 transition">
                <td className="px-6 py-3 text-xs text-gray-400 whitespace-nowrap tabular-nums">
                  {tx.transactionDate}
                </td>
                <td className="px-6 py-3 text-gray-700 max-w-xs">
                  <span className="line-clamp-1">{tx.detail}</span>
                </td>
                <td className="px-6 py-3">
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    {tx.category ?? 'Uncategorized'}
                  </span>
                </td>
                <td className="px-6 py-3 text-right whitespace-nowrap tabular-nums">
                  <span className={`text-sm font-medium ${tx.type === 'credit' ? 'text-green-600' : 'text-red-500'}`}>
                    {tx.type === 'credit' ? '+' : '−'}{formatIDR(tx.amount)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bottom save CTA */}
      {!saved && (
        <div className="flex justify-end pb-4">
          <button
            onClick={() => onSave()}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-5 py-3 rounded-xl transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Save to Dashboard
          </button>
        </div>
      )}
    </div>
  )
}
