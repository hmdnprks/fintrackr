/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useMemo } from 'react'
import { formatIDR } from '@/lib/formatter'
import { categorizeTransaction } from '@/lib/categorizer/mandiri/transactionCategorizer'
import {
  getGoals, addGoal, deleteGoal,
  type Goal, type SavingsGoal, type SpendingGoal,
} from '@/lib/goalStorage'

const SPEND_CATEGORIES = [
  'Food & Dining', 'Groceries', 'Shopping', 'Services',
  'Transportation', 'Health & Medical', 'Entertainment',
  'Education', 'Housing', 'Insurance', 'Bank Charges',
]

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function formatThousands(n: number): string {
  return n ? new Intl.NumberFormat('id-ID').format(n) : ''
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1).toLocaleString('en-US', { month: 'short', year: 'numeric' })
}

function monthsRemaining(deadline: string): number {
  const now = new Date()
  const [y, m] = deadline.split('-').map(Number)
  return (y - now.getFullYear()) * 12 + (m - (now.getMonth() + 1))
}

// ─── progress computers ──────────────────────────────────────────────────────

function computeSavingsProgress(goal: SavingsGoal, statements: any[]) {
  let income = 0, expense = 0
  for (const s of statements) {
    if (!s.monthKey) continue
    if (s.monthKey < goal.startMonth || s.monthKey > goal.deadline) continue
    for (const tx of s.transactions || []) {
      if (tx.type === 'credit') income += tx.amount || 0
      else expense += tx.amount || 0
    }
  }
  const saved = Math.max(0, income - expense)
  const pct   = Math.min((saved / goal.targetAmount) * 100, 100)
  return { saved, pct, remaining: Math.max(0, goal.targetAmount - saved) }
}

function computeSpendingProgress(goal: SpendingGoal, statements: any[]) {
  // aggregate spending per month for this category
  const byMonth: Record<string, number> = {}
  for (const s of statements) {
    if (!s.monthKey) continue
    for (const tx of s.transactions || []) {
      if (tx.type !== 'debit') continue
      const cat = tx.category || categorizeTransaction(tx.detail, tx.type)
      if (cat !== goal.category) continue
      byMonth[s.monthKey] = (byMonth[s.monthKey] || 0) + (tx.amount || 0)
    }
  }

  const sortedKeys = Object.keys(byMonth).sort()
  // show last max(targetMonths+1, 6) months that have spending
  const displayKeys = sortedKeys.slice(-Math.max(goal.targetMonths + 1, 6))

  const results = displayKeys.map((k) => ({
    monthKey: k,
    label: monthLabel(k),
    amount: byMonth[k],
    passed: byMonth[k] <= goal.monthlyLimit,
  }))

  // streak: count consecutive passes from the most recent month going back
  let streak = 0
  for (let i = results.length - 1; i >= 0; i--) {
    if (results[i].passed) streak++
    else break
  }

  const achieved = streak >= goal.targetMonths

  return { results, streak, achieved }
}

// ─── add goal modal ───────────────────────────────────────────────────────────

const currentYYYYMM = (() => {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`
})()

function AddGoalModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [goalType, setGoalType] = useState<'savings' | 'spending'>('savings')

  // savings fields
  const [targetAmount, setTargetAmount] = useState('')
  const [deadlineMonth, setDeadlineMonth] = useState(String(new Date().getMonth() + 1))
  const [deadlineYear, setDeadlineYear]   = useState(String(new Date().getFullYear() + 1))
  const [startMonth, setStartMonth]       = useState(currentYYYYMM)

  // spending fields
  const [category, setCategory]     = useState(SPEND_CATEGORIES[0])
  const [monthlyLimit, setMonthlyLimit] = useState('')
  const [targetMonths, setTargetMonths] = useState('3')

  const [error, setError] = useState('')

  const rawTarget = Number(targetAmount.replace(/[^0-9]/g, ''))
  const rawLimit  = Number(monthlyLimit.replace(/[^0-9]/g, ''))
  const deadlineKey = `${deadlineYear}-${String(deadlineMonth).padStart(2, '0')}`

  const years = Array.from({ length: 6 }, (_, i) => String(new Date().getFullYear() + i))

  function handleSubmit() {
    setError('')
    if (goalType === 'savings') {
      if (!rawTarget || rawTarget <= 0) { setError('Enter a target amount'); return }
      if (deadlineKey <= currentYYYYMM)  { setError('Deadline must be in the future'); return }
      addGoal({ type: 'savings', targetAmount: rawTarget, deadline: deadlineKey, startMonth })
    } else {
      if (!rawLimit || rawLimit <= 0)         { setError('Enter a monthly limit'); return }
      const months = Number(targetMonths)
      if (!months || months < 1 || months > 24) { setError('Target months must be between 1 and 24'); return }
      addGoal({ type: 'spending', category, monthlyLimit: rawLimit, targetMonths: months })
    }
    onAdded()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <h3 className="text-lg font-semibold text-gray-900">New Goal</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Type toggle */}
        <div className="px-6 pb-5">
          <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-xl">
            {(['savings', 'spending'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setGoalType(t)}
                className={`py-2.5 rounded-lg text-sm font-semibold transition capitalize ${
                  goalType === t ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {t === 'savings' ? '💰 Savings' : '🎯 Spending'}
              </button>
            ))}
          </div>
        </div>

        <div className="h-px bg-gray-100" />

        <div className="px-6 py-5 space-y-4">
          {goalType === 'savings' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Target Amount</label>
                <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
                  <span className="px-3 py-2.5 text-sm text-gray-400 bg-gray-50 border-r border-gray-200 select-none">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="10.000.000"
                    value={targetAmount}
                    onChange={(e) => {
                      const d = e.target.value.replace(/[^0-9]/g, '')
                      setTargetAmount(d ? formatThousands(Number(d)) : '')
                    }}
                    className="flex-1 px-3 py-2.5 text-sm focus:outline-none"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Deadline</label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={deadlineMonth}
                    onChange={(e) => setDeadlineMonth(e.target.value)}
                    className="text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {MONTHS.map((m, i) => (
                      <option key={m} value={String(i + 1)}>{m}</option>
                    ))}
                  </select>
                  <select
                    value={deadlineYear}
                    onChange={(e) => setDeadlineYear(e.target.value)}
                    className="text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {years.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Count savings from</label>
                <input
                  type="month"
                  value={startMonth}
                  onChange={(e) => setStartMonth(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {SPEND_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Monthly Limit</label>
                <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
                  <span className="px-3 py-2.5 text-sm text-gray-400 bg-gray-50 border-r border-gray-200 select-none">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="1.500.000"
                    value={monthlyLimit}
                    onChange={(e) => {
                      const d = e.target.value.replace(/[^0-9]/g, '')
                      setMonthlyLimit(d ? formatThousands(Number(d)) : '')
                    }}
                    className="flex-1 px-3 py-2.5 text-sm focus:outline-none"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  For how many consecutive months?
                </label>
                <div className="flex items-center gap-3">
                  {[1, 2, 3, 6].map((n) => (
                    <button
                      key={n}
                      onClick={() => setTargetMonths(String(n))}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium border transition ${
                        targetMonths === String(n)
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                  <input
                    type="number"
                    value={targetMonths}
                    onChange={(e) => setTargetMonths(e.target.value)}
                    min={1}
                    max={24}
                    className="w-16 text-center text-sm border border-gray-200 rounded-xl py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1.5">months</p>
              </div>
            </>
          )}

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            onClick={handleSubmit}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition mt-1"
          >
            Create Goal
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── goal cards ───────────────────────────────────────────────────────────────

function SavingsGoalCard({ goal, statements, onDelete }: {
  goal: SavingsGoal; statements: any[]; onDelete: () => void
}) {
  const { saved, pct, remaining } = useMemo(
    () => computeSavingsProgress(goal, statements),
    [goal, statements]
  )
  const months = monthsRemaining(goal.deadline)
  const isComplete  = pct >= 100
  const isOverdue   = months < 0 && !isComplete

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-2xl shadow-sm overflow-hidden border ${
      isComplete ? 'border-green-200 dark:border-green-800' : isOverdue ? 'border-red-200 dark:border-red-800' : 'border-gray-100 dark:border-gray-800'
    }`}>
      <div className={`px-5 py-4 ${isComplete ? 'bg-green-50 dark:bg-green-900/20' : isOverdue ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-50 dark:bg-gray-800'}`}>
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Savings Goal</span>
            <p className="text-base font-semibold text-gray-900 dark:text-gray-100 mt-0.5">
              Save {formatIDR(goal.targetAmount)}
            </p>
            <p className={`text-xs mt-0.5 ${isOverdue ? 'text-red-500' : 'text-gray-400'}`}>
              {isComplete
                ? '🎉 Goal achieved!'
                : isOverdue
                ? `Deadline passed (${monthLabel(goal.deadline)})`
                : `By ${monthLabel(goal.deadline)} · ${months} month${months !== 1 ? 's' : ''} left`}
            </p>
          </div>
          <button onClick={onDelete} className="text-gray-300 hover:text-red-400 transition mt-0.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="px-5 py-4 space-y-3">
        <div className="w-full h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${isComplete ? 'bg-green-500' : 'bg-blue-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className={`font-semibold ${isComplete ? 'text-green-600' : 'text-gray-800'}`}>
            {formatIDR(saved)} saved
          </span>
          <span className="text-gray-400 dark:text-gray-500">
            {isComplete ? 'Target reached' : `${formatIDR(remaining)} to go`}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
          <span>From {monthLabel(goal.startMonth)}</span>
          <span className="font-medium text-gray-600 dark:text-gray-400">{pct.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  )
}

function SpendingGoalCard({ goal, statements, onDelete }: {
  goal: SpendingGoal; statements: any[]; onDelete: () => void
}) {
  const { results, streak, achieved } = useMemo(
    () => computeSpendingProgress(goal, statements),
    [goal, statements]
  )

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-2xl shadow-sm overflow-hidden border ${
      achieved ? 'border-green-200 dark:border-green-800' : 'border-gray-100 dark:border-gray-800'
    }`}>
      <div className={`px-5 py-4 ${achieved ? 'bg-green-50 dark:bg-green-900/20' : 'bg-gray-50 dark:bg-gray-800'}`}>
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Spending Goal</span>
            <p className="text-base font-semibold text-gray-900 dark:text-gray-100 mt-0.5">
              {goal.category} &lt; {formatIDR(goal.monthlyLimit)}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {achieved
                ? `🎉 ${goal.targetMonths} months achieved!`
                : `Keep under limit for ${goal.targetMonths} consecutive months`}
            </p>
          </div>
          <button onClick={onDelete} className="text-gray-300 hover:text-red-400 transition mt-0.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Streak indicator */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {Array.from({ length: goal.targetMonths }).map((_, i) => (
              <div
                key={i}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  i < streak
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-300 dark:text-gray-600'
                }`}
              >
                {i < streak ? '✓' : '○'}
              </div>
            ))}
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {streak} of {goal.targetMonths} month{goal.targetMonths !== 1 ? 's' : ''}
            {streak > 0 ? ' streak' : ''}
          </span>
        </div>

        {/* Monthly results */}
        {results.length === 0 ? (
          <p className="text-xs text-gray-400">No spending data for this category yet.</p>
        ) : (
          <div className="space-y-2">
            {[...results].reverse().map((r) => (
              <div key={r.monthKey} className="flex items-center gap-3">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  r.passed ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'
                }`}>
                  {r.passed ? '✓' : '✗'}
                </span>
                <span className="text-xs text-gray-500 w-20 shrink-0">{r.label}</span>
                <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${r.passed ? 'bg-green-400' : 'bg-red-400'}`}
                    style={{ width: `${Math.min((r.amount / (goal.monthlyLimit * 1.5)) * 100, 100)}%` }}
                  />
                </div>
                <span className={`text-xs font-medium w-24 text-right shrink-0 ${
                  r.passed ? 'text-green-600' : 'text-red-500'
                }`}>
                  {formatIDR(r.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── main section ─────────────────────────────────────────────────────────────

interface Props {
  statements: any[]
}

export default function GoalSection({ statements }: Props) {
  const [goals, setGoals] = useState<Goal[]>(() => getGoals())
  const [showModal, setShowModal] = useState(false)

  function handleDelete(id: string) {
    deleteGoal(id)
    setGoals(getGoals())
  }

  return (
    <>
      {showModal && (
        <AddGoalModal
          onClose={() => setShowModal(false)}
          onAdded={() => setGoals(getGoals())}
        />
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Goals</h2>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
              {goals.length > 0
                ? `${goals.length} active goal${goals.length !== 1 ? 's' : ''}`
                : 'Track savings targets and spending habits'}
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Goal
          </button>
        </div>

        {goals.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 py-12 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-500">No goals yet</p>
            <p className="text-xs text-gray-400 mt-1 mb-4">Set a savings target or build a spending habit</p>
            <button
              onClick={() => setShowModal(true)}
              className="text-sm font-medium text-blue-600 hover:underline"
            >
              Create your first goal →
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {goals.map((goal) =>
              goal.type === 'savings' ? (
                <SavingsGoalCard
                  key={goal.id}
                  goal={goal}
                  statements={statements}
                  onDelete={() => handleDelete(goal.id)}
                />
              ) : (
                <SpendingGoalCard
                  key={goal.id}
                  goal={goal}
                  statements={statements}
                  onDelete={() => handleDelete(goal.id)}
                />
              )
            )}
          </div>
        )}
      </div>
    </>
  )
}
