'use client'

import { useState, useMemo } from 'react'
import { formatIDR } from '@/lib/formatter'
import { BudgetMap, setBudget } from '@/lib/budgetStorage'

const BUDGET_CATEGORIES = [
  'Food & Dining', 'Groceries', 'Shopping', 'Services',
  'Transportation', 'Health & Medical', 'Entertainment',
  'Education', 'Housing', 'Insurance', 'Bank Charges',
]

interface Props {
  budgets: BudgetMap
  spending: Record<string, number>
  onBudgetChange: () => void
}

const currentMonthLabel = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })

function formatThousands(n: number): string {
  if (!n) return ''
  return new Intl.NumberFormat('id-ID').format(n)
}

export default function BudgetSection({ budgets, spending, onBudgetChange }: Props) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [inputValue, setInputValue] = useState('')

  const budgetedCategories = useMemo(
    () => BUDGET_CATEGORIES.filter((c) => budgets[c] > 0),
    [budgets]
  )

  const availableCategories = useMemo(
    () => BUDGET_CATEGORIES.filter((c) => !budgets[c]),
    [budgets]
  )

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

  return (
    <>
      <div className="bg-white p-6 rounded-2xl shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Monthly Budgets</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {budgetedCategories.length > 0
                ? `${budgetedCategories.length} ${budgetedCategories.length === 1 ? 'category' : 'categories'} · `
                : ''}{currentMonthLabel}
            </p>
          </div>
          {availableCategories.length > 0 && (
            <button
              onClick={openAdd}
              className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add Budget
            </button>
          )}
        </div>

        {budgetedCategories.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-600">No budgets set yet</p>
            <p className="text-xs text-gray-400 mt-1 mb-4">Set monthly limits per category to track your spending</p>
            <button onClick={openAdd} className="text-sm font-medium text-blue-600 hover:underline">
              Set your first budget →
            </button>
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
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
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
                    <div className="flex items-center gap-3">
                      <span className="text-sm">
                        <span className={isOver ? 'text-red-600 font-medium' : 'text-gray-700'}>
                          {formatIDR(spent)}
                        </span>
                        <span className="text-gray-400"> / {formatIDR(budget)}</span>
                      </span>
                      <button
                        onClick={() => openEdit(category)}
                        title="Edit budget"
                        className="text-gray-400 hover:text-blue-600 transition"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleRemove(category)}
                        title="Remove budget"
                        className="text-gray-400 hover:text-red-500 transition"
                      >
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
                  {availableCategories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
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
                <span className="px-3 py-2.5 text-sm text-gray-500 bg-gray-50 border-r border-gray-200 select-none">
                  Rp
                </span>
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
