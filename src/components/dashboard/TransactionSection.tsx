/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useMemo, useState, useRef, useEffect } from 'react'
import RecurringSuggestionPanel from './RecurringSuggestionPanel'
import { formatIDR } from '@/lib/formatter'

const CATEGORIES = [
  'Income', 'Food & Dining', 'Groceries', 'Shopping',
  'Services', 'Transportation', 'Health & Medical',
  'Entertainment', 'Education', 'Housing', 'Insurance',
  'Bank Charges', 'Transfer', 'Uncategorized',
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

const PAGE_SIZE = 50

interface Props {
  transactions: any[]
  recurringSuggestions: any[]
  onRecategorize: (txIndex: number, newCategory: string) => void
  onCategorizeGroup: (indexes: number[], category: string) => void
  onAICategorize?: () => void
  isAICategorizing?: boolean
}

export default function TransactionSection({
  transactions,
  recurringSuggestions,
  onRecategorize,
  onCategorizeGroup,
  onAICategorize,
  isAICategorizing,
}: Props) {
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [page, setPage] = useState(1)
  const editingRef = useRef<HTMLSelectElement>(null)

  const isFiltered = search || filterCategory !== 'all' || filterType !== 'all'

  const filtered = useMemo(() => {
    setPage(1)
    return transactions.filter((tx: any) => {
      if (search && !tx.detail?.toLowerCase().includes(search.toLowerCase())) return false
      if (filterCategory !== 'all' && tx.category !== filterCategory) return false
      if (filterType !== 'all' && tx.type !== filterType) return false
      return true
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, search, filterCategory, filterType])

  const paginated = filtered.slice(0, page * PAGE_SIZE)
  const hasMore = filtered.length > page * PAGE_SIZE
  const uncategorizedCount = useMemo(
    () => transactions.filter((tx: any) => tx.category === 'Uncategorized').length,
    [transactions]
  )

  useEffect(() => {
    if (editingIndex !== null) editingRef.current?.focus()
  }, [editingIndex])

  function clearFilters() {
    setSearch('')
    setFilterCategory('all')
    setFilterType('all')
  }

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Transactions</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}
            {isFiltered && filtered.length !== transactions.length && (
              <span className="text-gray-400"> of {transactions.length}</span>
            )}
            {uncategorizedCount > 0 && (
              <span className="text-amber-500"> · {uncategorizedCount} uncategorized</span>
            )}
          </p>
        </div>

        {uncategorizedCount > 0 && onAICategorize && (
          <button
            onClick={onAICategorize}
            disabled={isAICategorizing}
            className="flex items-center gap-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            {isAICategorizing ? 'Categorizing...' : 'AI Categorize'}
          </button>
        )}
      </div>

      {/* Recurring suggestions */}
      <RecurringSuggestionPanel
        suggestions={recurringSuggestions}
        formatIDR={formatIDR}
        onCategorizeGroup={onCategorizeGroup}
      />

      {/* Filter bar */}
      <div className="bg-white rounded-2xl shadow-sm px-4 py-3 space-y-3">
        {/* Search row */}
        <div className="relative">
          <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Search by description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Controls row */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Category */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className={`text-sm border rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              filterCategory !== 'all' ? 'border-blue-400 text-blue-700 font-medium' : 'border-gray-200 text-gray-600'
            }`}
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Type toggle */}
          <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5">
            {([
              { value: 'all',    label: 'All' },
              { value: 'credit', label: '↑ In' },
              { value: 'debit',  label: '↓ Out' },
            ] as const).map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setFilterType(value)}
                className={`px-3 py-1.5 text-sm rounded-lg font-medium transition ${
                  filterType === value
                    ? value === 'credit'
                      ? 'bg-white text-green-600 shadow-sm'
                      : value === 'debit'
                      ? 'bg-white text-red-500 shadow-sm'
                      : 'bg-white text-gray-700 shadow-sm'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Active filter count + clear */}
          {isFiltered && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-500 transition ml-auto"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Transaction table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {paginated.length === 0 ? (
          <div className="text-center py-16">
            <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <p className="text-sm font-medium text-gray-400">No transactions found</p>
            {isFiltered && (
              <button onClick={clearFilters} className="text-sm text-blue-600 hover:underline mt-1">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-5 py-3 w-24">Date</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-5 py-3">Description</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-5 py-3 w-40">Category</th>
                  <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wide px-5 py-3 w-36">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginated.map((tx: any, i: number) => {
                  const isUncategorized = tx.category === 'Uncategorized'
                  const isCredit = tx.type === 'credit'
                  const colorClass = CATEGORY_COLORS[tx.category] || CATEGORY_COLORS['Uncategorized']

                  return (
                    <tr
                      key={i}
                      className={`group transition hover:bg-gray-50 ${isUncategorized ? 'border-l-2 border-l-amber-400' : ''}`}
                      onClick={() => setEditingIndex(null)}
                    >
                      <td className="px-5 py-3 text-gray-400 text-xs whitespace-nowrap">
                        {tx.fullDate?.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                      </td>

                      <td className="px-5 py-3">
                        <span className="text-gray-700 line-clamp-1">{tx.detail}</span>
                      </td>

                      <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                        {editingIndex === i ? (
                          <select
                            ref={editingRef}
                            defaultValue={tx.category || 'Uncategorized'}
                            onChange={(e) => {
                              onRecategorize(i, e.target.value)
                              setEditingIndex(null)
                            }}
                            onBlur={() => setEditingIndex(null)}
                            className="text-xs border border-blue-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                          >
                            {CATEGORIES.map((cat) => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        ) : (
                          <button
                            onClick={() => setEditingIndex(i)}
                            title="Click to change category"
                            className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full transition hover:opacity-80 ${colorClass}`}
                          >
                            {tx.category || 'Uncategorized'}
                            <svg className="w-3 h-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
                            </svg>
                          </button>
                        )}
                      </td>

                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <span className={`font-medium ${isCredit ? 'text-green-600' : 'text-gray-700'}`}>
                          {isCredit ? '+' : '−'}{formatIDR(tx.amount)}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {hasMore && (
              <div className="px-5 py-4 border-t border-gray-100 text-center">
                <button
                  onClick={() => setPage((p) => p + 1)}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Load more ({filtered.length - page * PAGE_SIZE} remaining)
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
