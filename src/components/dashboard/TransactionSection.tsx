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

type SortKey = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'

const PAGE_SIZE = 50

function SortIcon({ active, asc }: { active: boolean; asc: boolean }) {
  return (
    <span className={`inline-flex flex-col ml-1 leading-none ${active ? 'text-blue-500' : 'text-gray-300'}`}>
      <svg className={`w-2.5 h-2.5 ${active && asc ? 'text-blue-500' : ''}`} viewBox="0 0 10 6" fill="currentColor">
        <path d="M5 0L10 6H0z" />
      </svg>
      <svg className={`w-2.5 h-2.5 ${active && !asc ? 'text-blue-500' : ''}`} viewBox="0 0 10 6" fill="currentColor">
        <path d="M5 6L0 0h10z" />
      </svg>
    </span>
  )
}

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
  const [search, setSearch]               = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterType, setFilterType]       = useState('all')
  const [sortBy, setSortBy]               = useState<SortKey>('date-desc')
  const [editingOriginalIndex, setEditingOriginalIndex] = useState<number | null>(null)
  const [page, setPage]                   = useState(1)
  const editingRef = useRef<HTMLSelectElement>(null)

  const isFiltered = search || filterCategory !== 'all' || filterType !== 'all'

  // Fix 1 — tag each tx with its stable original index before any filtering/sorting
  const withIndex = useMemo(
    () => transactions.map((tx: any, i: number) => ({ ...tx, _idx: i })),
    [transactions]
  )

  const filtered = useMemo(() => {
    return withIndex.filter((tx: any) => {
      if (search && !tx.detail?.toLowerCase().includes(search.toLowerCase())) return false
      if (filterCategory !== 'all' && tx.category !== filterCategory) return false
      if (filterType !== 'all' && tx.type !== filterType) return false
      return true
    })
  }, [withIndex, search, filterCategory, filterType])

  // Fix 3 & 4 — sort with newest-first default
  const sorted = useMemo(() => {
    const arr = [...filtered]
    switch (sortBy) {
      case 'date-desc':   return arr.sort((a, b) => (b.fullDate?.getTime() ?? 0) - (a.fullDate?.getTime() ?? 0))
      case 'date-asc':    return arr.sort((a, b) => (a.fullDate?.getTime() ?? 0) - (b.fullDate?.getTime() ?? 0))
      case 'amount-desc': return arr.sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0))
      case 'amount-asc':  return arr.sort((a, b) => (a.amount ?? 0) - (b.amount ?? 0))
    }
  }, [filtered, sortBy])

  const paginated = sorted.slice(0, page * PAGE_SIZE)
  const hasMore   = sorted.length > page * PAGE_SIZE

  // Reset to first page whenever filters or sort change
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setPage(1) }, [search, filterCategory, filterType, sortBy])

  useEffect(() => {
    if (editingOriginalIndex !== null) editingRef.current?.focus()
  }, [editingOriginalIndex])

  // Fix 5 — total of filtered transactions
  const filteredTotal = useMemo(
    () => filtered.reduce((sum: number, tx: any) => sum + (tx.amount ?? 0), 0),
    [filtered]
  )

  // Fix 6 — show year when transactions span multiple years
  const showYear = useMemo(() => {
    const years = new Set(transactions.map((tx: any) => tx.fullDate?.getFullYear()).filter(Boolean))
    return years.size > 1
  }, [transactions])

  const uncategorizedCount = useMemo(
    () => transactions.filter((tx: any) => tx.category === 'Uncategorized').length,
    [transactions]
  )

  function clearFilters() {
    setSearch('')
    setFilterCategory('all')
    setFilterType('all')
  }

  function toggleSort(col: 'date' | 'amount') {
    setSortBy((prev) => {
      if (col === 'date')   return prev === 'date-desc'   ? 'date-asc'   : 'date-desc'
      if (col === 'amount') return prev === 'amount-desc' ? 'amount-asc' : 'amount-desc'
      return prev
    })
  }

  return (
    <div className="space-y-4">

      {/* Header — stacks on mobile, side-by-side on desktop */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Transactions</h2>
          <p className="text-sm text-gray-500 mt-0.5 flex flex-wrap gap-x-1">
            <span>{filtered.length} transaction{filtered.length !== 1 ? 's' : ''}</span>
            {isFiltered && filtered.length !== transactions.length && (
              <span className="text-gray-400">of {transactions.length}</span>
            )}
            {filtered.length > 0 && (
              <span className="text-gray-400">· {formatIDR(filteredTotal)}</span>
            )}
            {uncategorizedCount > 0 && (
              <span className="text-amber-500">· {uncategorizedCount} uncategorized</span>
            )}
          </p>
        </div>

        {uncategorizedCount > 0 && onAICategorize && (
          <div className="flex flex-col sm:items-end gap-1.5 shrink-0">
            <button
              onClick={onAICategorize}
              disabled={isAICategorizing}
              className="flex items-center gap-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto justify-center sm:justify-start"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              {isAICategorizing ? 'Categorizing...' : 'AI Categorize'}
            </button>
            <p className="text-xs text-gray-400">Sends descriptions to DeepSeek&apos;s API.</p>
          </div>
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
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          {/* Category + type on mobile: category full-width, type + clear on a row below */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className={`w-full sm:w-auto text-sm border rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              filterCategory !== 'all' ? 'border-blue-400 text-blue-700 font-medium' : 'border-gray-200 text-gray-600'
            }`}
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <div className="flex items-center gap-2 sm:ml-0">
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
                      ? value === 'credit' ? 'bg-white text-green-600 shadow-sm'
                      : value === 'debit'  ? 'bg-white text-red-500 shadow-sm'
                      :                      'bg-white text-gray-700 shadow-sm'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {isFiltered && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-500 transition"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Transaction table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden overflow-x-auto">
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
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="border-b border-gray-100">
                  {/* Fix 4 — sortable Date header */}
                  <th
                    className="text-left px-5 py-3 w-28 cursor-pointer select-none group"
                    onClick={() => toggleSort('date')}
                  >
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wide group-hover:text-gray-600 transition">
                      Date
                    </span>
                    <SortIcon active={sortBy.startsWith('date')} asc={sortBy === 'date-asc'} />
                  </th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-5 py-3">
                    Description
                  </th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-5 py-3 w-40">
                    Category
                  </th>
                  <th
                    className="text-right px-5 py-3 w-36 cursor-pointer select-none group"
                    onClick={() => toggleSort('amount')}
                  >
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wide group-hover:text-gray-600 transition">
                      Amount
                    </span>
                    <SortIcon active={sortBy.startsWith('amount')} asc={sortBy === 'amount-asc'} />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginated.map((tx: any) => {
                  const isUncategorized = tx.category === 'Uncategorized'
                  const isCredit        = tx.type === 'credit'
                  const colorClass      = CATEGORY_COLORS[tx.category] ?? CATEGORY_COLORS['Uncategorized']
                  const isEditing       = editingOriginalIndex === tx._idx

                  // Fix 6 — show year when spanning multiple years
                  const dateFormat: Intl.DateTimeFormatOptions = showYear
                    ? { day: '2-digit', month: 'short', year: '2-digit' }
                    : { day: '2-digit', month: 'short' }

                  return (
                    <tr
                      key={tx._idx}
                      className={`transition hover:bg-gray-50 ${isUncategorized ? 'border-l-2 border-l-amber-400' : ''}`}
                      onClick={() => setEditingOriginalIndex(null)}
                    >
                      <td className="px-5 py-3 text-gray-400 text-xs whitespace-nowrap tabular-nums">
                        {tx.fullDate?.toLocaleDateString('id-ID', dateFormat)}
                      </td>

                      <td className="px-5 py-3">
                        <span className="text-gray-700 line-clamp-1">{tx.detail}</span>
                      </td>

                      <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                        {isEditing ? (
                          <select
                            ref={editingRef}
                            defaultValue={tx.category ?? 'Uncategorized'}
                            onChange={(e) => {
                              // Fix 1 — use stable original index
                              onRecategorize(tx._idx, e.target.value)
                              setEditingOriginalIndex(null)
                            }}
                            onBlur={() => setEditingOriginalIndex(null)}
                            className="text-xs border border-blue-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                          >
                            {CATEGORIES.map((cat) => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        ) : (
                          <button
                            onClick={() => setEditingOriginalIndex(tx._idx)}
                            title="Click to change category"
                            className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full transition hover:opacity-80 ${colorClass}`}
                          >
                            {tx.category ?? 'Uncategorized'}
                            <svg className="w-3 h-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
                            </svg>
                          </button>
                        )}
                      </td>

                      {/* Fix 7 — debit amounts colored red */}
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <span className={`font-medium tabular-nums ${isCredit ? 'text-green-600' : 'text-red-500'}`}>
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
                  Load more ({sorted.length - page * PAGE_SIZE} remaining)
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
