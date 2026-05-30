/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState } from 'react'

const CATEGORIES = [
  'Income', 'Food & Dining', 'Groceries', 'Shopping',
  'Services', 'Transportation', 'Health & Medical',
  'Entertainment', 'Education', 'Housing', 'Insurance',
  'Bank Charges', 'Transfer', 'Loan',
]

interface Props {
  suggestions: any[]
  transactions: any[]
  formatIDR: (n: number) => string
  onCategorizeGroup: (indexes: number[], category: string) => void
}

function merchantLabel(detail: string): string {
  const parts = detail.split('/')
  if (parts.length >= 3) {
    const mid = parts[2].trim()
    if (mid && !/^\d+$/.test(mid) && mid.length > 1) return mid
  }
  return detail.length > 45 ? detail.slice(0, 45) + '…' : detail
}

function formatDate(tx: any): string {
  const d = tx.fullDate instanceof Date ? tx.fullDate : new Date(tx.transactionDate)
  if (isNaN(d.getTime())) return tx.transactionDate ?? '—'
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function RecurringSuggestionPanel({ suggestions, transactions, formatIDR, onCategorizeGroup }: Props) {
  const [selections, setSelections]   = useState<Record<string, string>>({})
  const [expandedKey, setExpandedKey] = useState<string | null>(null)

  if (!suggestions.length) return null

  function handleApply(item: any) {
    const category = selections[item.normalizedDetail]
    if (!category) return
    onCategorizeGroup(item.transactionIndexes, category)
    setSelections((prev) => {
      const next = { ...prev }
      delete next[item.normalizedDetail]
      return next
    })
    if (expandedKey === item.normalizedDetail) setExpandedKey(null)
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-amber-200 dark:border-amber-800 rounded-2xl overflow-hidden shadow-sm">
      <div className="bg-amber-50 dark:bg-amber-900/20 px-5 py-3 flex items-center gap-2 border-b border-amber-100 dark:border-amber-800">
        <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
        </svg>
        <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">
          Recurring uncategorized — {suggestions.length} pattern{suggestions.length !== 1 ? 's' : ''} found
        </span>
      </div>

      <div className="divide-y divide-gray-50 dark:divide-gray-800">
        {suggestions.map((item: any) => {
          const selected  = selections[item.normalizedDetail] || ''
          const isExpanded = expandedKey === item.normalizedDetail

          // Last 5 transactions for this pattern, newest first
          const sample = (item.transactionIndexes as number[])
            .map((i: number) => transactions[i])
            .filter(Boolean)
            .sort((a: any, b: any) => {
              const da = a.fullDate instanceof Date ? a.fullDate : new Date(a.transactionDate)
              const db = b.fullDate instanceof Date ? b.fullDate : new Date(b.transactionDate)
              return db.getTime() - da.getTime()
            })
            .slice(0, 5)

          return (
            <div key={item.normalizedDetail}>
              {/* Main row */}
              <div className="flex items-center gap-4 px-5 py-3">
                {/* Description + expand toggle */}
                <button
                  className="flex-1 min-w-0 text-left group"
                  onClick={() => setExpandedKey(isExpanded ? null : item.normalizedDetail)}
                  title="Click to see individual transactions"
                >
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{merchantLabel(item.sampleDetail)}</p>
                    <svg
                      className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {item.occurrences}× · {formatIDR(item.totalAmount)} total
                  </p>
                </button>

                <select
                  value={selected}
                  onChange={(e) => setSelections((prev) => ({ ...prev, [item.normalizedDetail]: e.target.value }))}
                  className="text-sm border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-1.5 bg-white dark:bg-gray-800 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 shrink-0"
                >
                  <option value="" disabled>Assign category…</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>

                <button
                  onClick={() => handleApply(item)}
                  disabled={!selected}
                  className="text-sm font-medium px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                >
                  Apply
                </button>
              </div>

              {/* Expanded: last 5 transactions */}
              {isExpanded && (
                <div className="px-5 pb-4 space-y-2">
                  <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
                    Last {sample.length} occurrence{sample.length !== 1 ? 's' : ''} — check in Livin Mandiri to identify
                  </p>
                  <div className="rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                    {sample.map((tx: any, i: number) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 px-4 py-2.5 text-xs border-b border-gray-50 dark:border-gray-800 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                      >
                        <span className="text-gray-400 dark:text-gray-500 shrink-0 tabular-nums mt-0.5 w-24">
                          {formatDate(tx)}
                        </span>
                        <span className="flex-1 text-gray-600 dark:text-gray-400 break-all leading-relaxed">
                          {tx.detail}
                        </span>
                        <span className={`font-semibold tabular-nums shrink-0 ${tx.type === 'credit' ? 'text-green-600' : 'text-red-500'}`}>
                          {tx.type === 'credit' ? '+' : '−'}{formatIDR(tx.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
                    Open <strong className="text-gray-600 dark:text-gray-300">Livin by Mandiri</strong> → Riwayat → cari nominal dan tanggal di atas untuk melihat detail merchant.
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
