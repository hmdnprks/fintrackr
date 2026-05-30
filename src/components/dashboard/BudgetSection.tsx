/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useMemo } from 'react'
import { formatIDR } from '@/lib/formatter'
import { BudgetMap, setBudget } from '@/lib/budgetStorage'
import type { BudgetSuggestion } from '@/lib/categorizer/aiCategorizer'

const BUDGET_CATEGORIES = [
  'Food & Dining', 'Groceries', 'Shopping', 'Services',
  'Transportation', 'Health & Medical', 'Entertainment',
  'Education', 'Housing', 'Insurance', 'Bank Charges',
]

const SKIP_FOR_AVERAGES = new Set(['Transfer', 'Bank Charges', 'Uncategorized', 'Income'])

interface Props {
  budgets: BudgetMap
  spending: Record<string, number>
  statements: any[]
  onBudgetChange: () => void
}

const currentMonthLabel = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })

function formatThousands(n: number): string {
  if (!n) return ''
  return new Intl.NumberFormat('id-ID').format(n)
}

function computeAverages(statements: any[], nMonths = 3) {
  const sorted = [...statements]
    .filter((s) => s.monthKey)
    .sort((a, b) => b.monthKey.localeCompare(a.monthKey))
    .slice(0, nMonths)

  if (!sorted.length) return []

  const map: Record<string, number[]> = {}
  for (const s of sorted) {
    const monthly: Record<string, number> = {}
    for (const tx of s.transactions || []) {
      if (tx.type !== 'debit') continue
      const cat = tx.category || 'Uncategorized'
      if (SKIP_FOR_AVERAGES.has(cat)) continue
      monthly[cat] = (monthly[cat] || 0) + (tx.amount || 0)
    }
    for (const [cat, amt] of Object.entries(monthly)) {
      if (!map[cat]) map[cat] = []
      map[cat].push(amt)
    }
  }

  return Object.entries(map)
    .map(([category, amounts]) => ({
      category,
      average: Math.round(amounts.reduce((s, a) => s + a, 0) / sorted.length),
      months: amounts.length,
    }))
    .filter((c) => c.average >= 50_000)
    .sort((a, b) => b.average - a.average)
}

// ─── AI suggestion review modal ───────────────────────────────────────────────

interface ReviewRow {
  category: string
  average: number
  suggested: number
  editValue: string
  reason: string
  selected: boolean
}

function AISuggestModal({
  rows,
  onApply,
  onClose,
}: {
  rows: ReviewRow[]
  onApply: (rows: ReviewRow[]) => void
  onClose: () => void
}) {
  const [state, setState] = useState<ReviewRow[]>(rows)

  function toggleSelected(i: number) {
    setState((prev) => prev.map((r, idx) => idx === i ? { ...r, selected: !r.selected } : r))
  }

  function updateValue(i: number, raw: string) {
    const digits = raw.replace(/[^0-9]/g, '')
    setState((prev) => prev.map((r, idx) =>
      idx === i
        ? { ...r, editValue: digits ? formatThousands(Number(digits)) : '', suggested: Number(digits) || 0 }
        : r
    ))
  }

  const selectedCount = state.filter((r) => r.selected).length

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">AI Budget Suggestions</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Based on your last 3 months. Edit any amount, then apply.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition mt-0.5">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Rows */}
        <div className="overflow-y-auto divide-y divide-gray-50">
          {state.map((row, i) => (
            <div
              key={row.category}
              className={`px-6 py-4 transition ${row.selected ? '' : 'opacity-40'}`}
            >
              <div className="flex items-start gap-3">
                {/* Checkbox */}
                <button
                  onClick={() => toggleSelected(i)}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition ${
                    row.selected
                      ? 'bg-blue-600 border-blue-600'
                      : 'border-gray-300 hover:border-blue-400'
                  }`}
                >
                  {row.selected && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  {/* Category + avg */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-sm font-medium text-gray-800">{row.category}</span>
                    <span className="text-xs text-gray-400 shrink-0">
                      avg {formatIDR(row.average)}/mo
                    </span>
                  </div>

                  {/* Editable amount */}
                  <div className={`flex items-center border rounded-xl overflow-hidden ${
                    row.selected
                      ? 'border-gray-200 focus-within:ring-2 focus-within:ring-blue-500'
                      : 'border-gray-100'
                  }`}>
                    <span className="px-3 py-2 text-sm text-gray-400 bg-gray-50 border-r border-gray-200 select-none">Rp</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={row.editValue}
                      onChange={(e) => updateValue(i, e.target.value)}
                      disabled={!row.selected}
                      className="flex-1 px-3 py-2 text-sm focus:outline-none bg-white disabled:bg-gray-50 disabled:text-gray-400"
                    />
                  </div>

                  {/* AI reason */}
                  {row.reason && (
                    <p className="text-xs text-gray-400 mt-1.5 italic">{row.reason}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
          <button
            onClick={() => setState((prev) => prev.map((r) => ({ ...r, selected: !prev.every((x) => x.selected) })))}
            className="text-sm text-gray-500 hover:text-gray-700 transition"
          >
            {state.every((r) => r.selected) ? 'Deselect all' : 'Select all'}
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={() => onApply(state.filter((r) => r.selected && r.suggested > 0))}
              disabled={selectedCount === 0}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition"
            >
              Apply {selectedCount > 0 ? `${selectedCount} budget${selectedCount !== 1 ? 's' : ''}` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main section ─────────────────────────────────────────────────────────────

export default function BudgetSection({ budgets, spending, statements, onBudgetChange }: Props) {
  const [modalOpen, setModalOpen]       = useState(false)
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [inputValue, setInputValue]     = useState('')

  const [aiLoading, setAiLoading]       = useState(false)
  const [aiError, setAiError]           = useState('')
  const [reviewRows, setReviewRows]     = useState<ReviewRow[] | null>(null)

  const budgetedCategories = useMemo(
    () => BUDGET_CATEGORIES.filter((c) => budgets[c] > 0),
    [budgets]
  )
  const availableCategories = useMemo(
    () => BUDGET_CATEGORIES.filter((c) => !budgets[c]),
    [budgets]
  )

  // ── manual add/edit ──────────────────────────────────────────────────────
  function openAdd() {
    setEditingCategory(null)
    setSelectedCategory(availableCategories[0] || '')
    setInputValue('')
    setModalOpen(true)
  }
  function openEdit(category: string) {
    setEditingCategory(category)
    setSelectedCategory(category)
    setInputValue(formatThousands(budgets[category]))
    setModalOpen(true)
  }
  function handleSave() {
    const amount = Number(inputValue.replace(/[^0-9]/g, ''))
    if (!selectedCategory || amount <= 0) return
    setBudget(selectedCategory, amount)
    onBudgetChange()
    setModalOpen(false)
  }
  function handleRemove(category: string) {
    setBudget(category, 0)
    onBudgetChange()
  }
  const contextSpend = selectedCategory ? (spending[selectedCategory] || 0) : 0

  // ── AI suggestions ───────────────────────────────────────────────────────
  async function handleAISuggest() {
    const averages = computeAverages(statements)
    if (!averages.length) {
      setAiError('Not enough spending history yet — import at least one statement first.')
      return
    }

    setAiLoading(true)
    setAiError('')
    try {
      const apiKey = localStorage.getItem('fintrackr_chat_api_key') || undefined
      const res  = await fetch('/api/categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'budget-suggestions', averages, apiKey }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'AI suggestion failed')

      const suggestions: BudgetSuggestion[] = data.suggestions
      const rows: ReviewRow[] = suggestions.map((s) => ({
        category: s.category,
        average: averages.find((a) => a.category === s.category)?.average || 0,
        suggested: s.suggested,
        editValue: formatThousands(s.suggested),
        reason: s.reason,
        selected: true,
      }))
      setReviewRows(rows)
    } catch (e: any) {
      setAiError(e.message)
    } finally {
      setAiLoading(false)
    }
  }

  function handleApplySuggestions(rows: ReviewRow[]) {
    for (const row of rows) {
      if (row.suggested > 0) setBudget(row.category, row.suggested)
    }
    onBudgetChange()
    setReviewRows(null)
  }

  return (
    <>
      {reviewRows && (
        <AISuggestModal
          rows={reviewRows}
          onApply={handleApplySuggestions}
          onClose={() => setReviewRows(null)}
        />
      )}

      <div className="bg-white p-6 rounded-2xl shadow-sm">
        {/* Header — stacks on mobile */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Monthly Budgets</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {budgetedCategories.length > 0
                ? `${budgetedCategories.length} ${budgetedCategories.length === 1 ? 'category' : 'categories'} · `
                : ''}{currentMonthLabel}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleAISuggest}
              disabled={aiLoading}
              title="Get AI budget suggestions based on your spending history"
              className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {aiLoading ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              )}
              <span className="hidden sm:inline">{aiLoading ? 'Thinking…' : 'Suggest with AI'}</span>
              <span className="sm:hidden">{aiLoading ? '…' : 'AI Suggest'}</span>
            </button>

            {availableCategories.length > 0 && (
              <button
                onClick={openAdd}
                className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add
              </button>
            )}
          </div>
        </div>

        {/* AI error */}
        {aiError && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-5 text-sm text-red-600">
            <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            {aiError}
          </div>
        )}

        {budgetedCategories.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-600">No budgets set yet</p>
            <p className="text-xs text-gray-400 mt-1 mb-4">Add manually or let AI suggest based on your spending history</p>
            <div className="flex items-center justify-center gap-3">
              <button onClick={openAdd} className="text-sm font-medium text-blue-600 hover:underline">
                Add manually
              </button>
              <span className="text-gray-300">·</span>
              <button onClick={handleAISuggest} disabled={aiLoading} className="text-sm font-medium text-indigo-600 hover:underline disabled:opacity-50">
                Suggest with AI
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {budgetedCategories.map((category) => {
              const budget = budgets[category]
              const spent = spending[category] || 0
              const pct = Math.min((spent / budget) * 100, 100)
              const isOver = spent > budget
              const isWarning = !isOver && pct >= 80

              return (
                <div key={category}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    {/* Left — category + amount (stacked on mobile) */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-800">{category}</span>
                        {isOver && (
                          <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                            Over budget
                          </span>
                        )}
                        {isWarning && (
                          <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                            {Math.round(pct)}%
                          </span>
                        )}
                      </div>
                      <p className="text-xs mt-0.5">
                        <span className={isOver ? 'text-red-600 font-medium' : 'text-gray-600'}>
                          {formatIDR(spent)}
                        </span>
                        <span className="text-gray-400"> / {formatIDR(budget)}</span>
                      </p>
                    </div>
                    {/* Right — actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => openEdit(category)} title="Edit" className="text-gray-400 hover:text-blue-600 transition p-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                        </svg>
                      </button>
                      <button onClick={() => handleRemove(category)} title="Remove" className="text-gray-400 hover:text-red-500 transition p-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isOver ? 'bg-red-500' : isWarning ? 'bg-amber-400' : 'bg-green-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Manual add/edit modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-5">
            <h3 className="text-lg font-semibold text-gray-900">
              {editingCategory ? `Edit Budget — ${editingCategory}` : 'Set Budget'}
            </h3>

            {!editingCategory && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {availableCategories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}

            {contextSpend > 0 && (
              <div className="bg-blue-50 rounded-xl px-4 py-3 text-sm text-blue-800">
                You spent <span className="font-semibold">{formatIDR(contextSpend)}</span> on {selectedCategory} in {currentMonthLabel}.
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Monthly Limit</label>
              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
                <span className="px-3 py-2.5 text-sm text-gray-500 bg-gray-50 border-r border-gray-200 select-none">Rp</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={inputValue}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/[^0-9]/g, '')
                    setInputValue(digits ? formatThousands(Number(digits)) : '')
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                  placeholder="1.500.000"
                  autoFocus
                  className="flex-1 px-3 py-2.5 text-sm focus:outline-none bg-white"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!inputValue}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
