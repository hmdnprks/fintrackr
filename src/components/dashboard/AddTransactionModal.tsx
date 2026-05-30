'use client'

import { useState } from 'react'
import { addManualTransaction } from '@/lib/manualStorage'

const CATEGORIES = [
  'Food & Dining', 'Groceries', 'Shopping', 'Services',
  'Transportation', 'Health & Medical', 'Entertainment',
  'Education', 'Housing', 'Insurance', 'Bank Charges',
  'Transfer', 'Loan', 'Income', 'Uncategorized',
]

interface Props {
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
}

function formatThousands(n: number): string {
  if (!n) return ''
  return new Intl.NumberFormat('id-ID').format(n)
}

export default function AddTransactionModal({ isOpen, onClose, onSaved }: Props) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [detail, setDetail] = useState('')
  const [amount, setAmount] = useState('')
  const [type, setType] = useState<'debit' | 'credit'>('debit')
  const [category, setCategory] = useState('Uncategorized')
  const [errors, setErrors] = useState<Record<string, string>>({})

  if (!isOpen) return null

  const rawAmount = Number(amount.replace(/[^0-9]/g, ''))

  function validate() {
    const e: Record<string, string> = {}
    if (!detail.trim()) e.detail = 'Description is required'
    if (!rawAmount || rawAmount <= 0) e.amount = 'Enter a valid amount'
    return e
  }

  function handleSubmit() {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }

    addManualTransaction({
      transactionDate: date,
      detail: detail.trim(),
      amount: rawAmount,
      type,
      category,
    })

    setDetail('')
    setAmount('')
    setType('debit')
    setCategory('Uncategorized')
    setErrors({})
    onSaved()
    onClose()
  }

  function handleClose() {
    setErrors({})
    onClose()
  }

  const isExpense = type === 'debit'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md z-10 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <h3 className="text-lg font-semibold text-gray-900">Add Transaction</h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Type toggle */}
        <div className="px-6 pb-5">
          <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => { setType('debit'); setCategory('Uncategorized') }}
              className={`py-2.5 rounded-lg text-sm font-semibold transition ${
                isExpense
                  ? 'bg-white text-red-500 shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              ↓ Expense
            </button>
            <button
              onClick={() => { setType('credit'); setCategory('Income') }}
              className={`py-2.5 rounded-lg text-sm font-semibold transition ${
                !isExpense
                  ? 'bg-white text-green-600 shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              ↑ Income
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-100" />

        {/* Fields */}
        <div className="px-6 py-5 space-y-4">

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <input
              type="text"
              placeholder="e.g. Lunch at Warung Bu Sri"
              value={detail}
              onChange={(e) => { setDetail(e.target.value); setErrors((prev) => ({ ...prev, detail: '' })) }}
              className={`w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.detail ? 'border-red-300 bg-red-50' : 'border-gray-200'
              }`}
            />
            {errors.detail && <p className="text-xs text-red-500 mt-1">{errors.detail}</p>}
          </div>

          {/* Date + Amount side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount</label>
              <div className={`flex items-center border rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 ${
                errors.amount ? 'border-red-300 bg-red-50' : 'border-gray-200'
              }`}>
                <span className="px-3 py-2.5 text-sm text-gray-400 bg-gray-50 border-r border-gray-200 select-none">Rp</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/[^0-9]/g, '')
                    setAmount(digits ? formatThousands(Number(digits)) : '')
                    setErrors((prev) => ({ ...prev, amount: '' }))
                  }}
                  className="flex-1 px-3 py-2.5 text-sm focus:outline-none bg-transparent min-w-0"
                />
              </div>
              {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount}</p>}
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Preview */}
          {detail && rawAmount > 0 && (
            <div className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm ${
              isExpense ? 'bg-red-50 border border-red-100' : 'bg-green-50 border border-green-100'
            }`}>
              <span className="text-gray-600 truncate">{detail}</span>
              <span className={`font-semibold ml-4 shrink-0 ${isExpense ? 'text-red-500' : 'text-green-600'}`}>
                {isExpense ? '−' : '+'}Rp {formatThousands(rawAmount)}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <button
            onClick={handleSubmit}
            className={`w-full py-3 rounded-xl text-sm font-semibold text-white transition ${
              isExpense
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {isExpense ? 'Add Expense' : 'Add Income'}
          </button>
        </div>

      </div>
    </div>
  )
}
