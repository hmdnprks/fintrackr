/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState } from 'react'

const CATEGORIES = [
  'Income', 'Food & Dining', 'Groceries', 'Shopping',
  'Services', 'Transportation', 'Health & Medical',
  'Entertainment', 'Education', 'Housing', 'Insurance',
  'Bank Charges', 'Transfer',
]

interface Props {
  suggestions: any[]
  formatIDR: (n: number) => string
  onCategorizeGroup: (indexes: number[], category: string) => void
}

export default function RecurringSuggestionPanel({ suggestions, formatIDR, onCategorizeGroup }: Props) {
  const [selections, setSelections] = useState<Record<string, string>>({})

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
  }

  return (
    <div className="bg-white border border-amber-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="bg-amber-50 px-5 py-3 flex items-center gap-2 border-b border-amber-100">
        <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
        </svg>
        <span className="text-sm font-semibold text-amber-800">
          Recurring uncategorized — {suggestions.length} pattern{suggestions.length !== 1 ? 's' : ''} found
        </span>
      </div>

      <div className="divide-y divide-gray-50">
        {suggestions.map((item: any) => {
          const selected = selections[item.normalizedDetail] || ''
          return (
            <div key={item.normalizedDetail} className="flex items-center gap-4 px-5 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{item.sampleDetail}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {item.occurrences}× · {formatIDR(item.totalAmount)} total
                </p>
              </div>

              <select
                value={selected}
                onChange={(e) => setSelections((prev) => ({ ...prev, [item.normalizedDetail]: e.target.value }))}
                className="text-sm border border-gray-200 rounded-xl px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shrink-0"
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
          )
        })}
      </div>
    </div>
  )
}
