/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useMemo } from 'react'

interface Props {
  statements: any[]
}

const EXCLUDE = new Set(['Transfer', 'Bank Charges', 'Loan'])

function formatIDR(n: number) {
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}jt`
  if (n >= 1_000)     return `Rp ${Math.round(n / 1_000)}rb`
  return `Rp ${Math.round(n).toLocaleString('id-ID')}`
}

function stdDev(arr: number[]): number {
  const mean = arr.reduce((s, v) => s + v, 0) / arr.length
  return Math.sqrt(arr.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / arr.length)
}

export default function SpendingForecastSection({ statements }: Props) {
  const forecast = useMemo(() => {
    if (!statements.length) return null

    const byMonth: Record<string, { income: number; expense: number }> = {}
    for (const s of statements) {
      if (!s.monthKey) continue
      if (!byMonth[s.monthKey]) byMonth[s.monthKey] = { income: 0, expense: 0 }
      for (const tx of s.transactions || []) {
        const amt = tx.amount || 0
        if (tx.type === 'credit') byMonth[s.monthKey].income += amt
        else if (tx.type === 'debit' && !EXCLUDE.has(tx.category)) byMonth[s.monthKey].expense += amt
      }
    }

    const recent = Object.entries(byMonth)
      .filter(([, v]) => v.income > 0 || v.expense > 0)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 3)

    if (recent.length < 2) return null

    const incomes  = recent.map(([, v]) => v.income)
    const expenses = recent.map(([, v]) => v.expense)

    const avgIncome  = incomes.reduce((s, v) => s + v, 0)  / incomes.length
    const avgExpense = expenses.reduce((s, v) => s + v, 0) / expenses.length
    const avgNet     = avgIncome - avgExpense

    // Confidence based on expense variance (CV = stddev / mean)
    const cv = avgExpense > 0 ? stdDev(expenses) / avgExpense : 0
    const confidence = cv < 0.15 ? 'high' : cv < 0.35 ? 'medium' : 'low'

    // Next month label
    const latestKey = recent[0][0]  // most recent month key YYYY-MM
    const [y, m] = latestKey.split('-').map(Number)
    const nextDate  = new Date(y, m)  // m already 1-based → this gives next month
    const nextLabel = nextDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })

    return { avgIncome, avgExpense, avgNet, confidence, nextLabel, months: recent.length }
  }, [statements])

  if (!forecast) return null

  const CONF = {
    high: {
      label: 'High confidence',
      color: 'text-green-600 dark:text-green-400',
      bg:    'bg-green-50 dark:bg-green-900/20',
      icon:  '✓',
      explanation: 'Your income and spending have been very consistent over the last 3 months (less than 15% variation). This projection is a reliable estimate.',
      hint: 'Good time to set a monthly budget based on these numbers — your patterns are stable enough to plan around.',
    },
    medium: {
      label: 'Medium confidence',
      color: 'text-amber-600 dark:text-amber-400',
      bg:    'bg-amber-50 dark:bg-amber-900/20',
      icon:  '~',
      explanation: 'Your spending varied 15–35% across the last 3 months — at least one month was noticeably different from the others.',
      hint: 'Check which category drove the spike. If it was a one-time purchase (travel, annual subscription), the forecast may actually be more accurate than it looks.',
    },
    low: {
      label: 'Low confidence',
      color: 'text-red-500 dark:text-red-400',
      bg:    'bg-red-50 dark:bg-red-900/20',
      icon:  '!',
      explanation: 'Your spending varied more than 35% month to month — the pattern is too irregular for a reliable projection.',
      hint: 'Possible causes: irregular income (freelance, bonus), large one-time expenses, or many Uncategorized transactions skewing the numbers. Recategorize your transactions and check again — a cleaner dataset will improve accuracy.',
    },
  }
  const conf = CONF[forecast.confidence as keyof typeof CONF]

  return (
    <div className="bg-white dark:bg-gray-900 dark:border dark:border-gray-800 p-6 rounded-2xl shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Spending Forecast</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            Projected for <span className="font-medium text-gray-600 dark:text-gray-300">{forecast.nextLabel}</span>
            {' '}· based on last {forecast.months} months
          </p>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${conf.color} ${conf.bg}`}>
          {conf.label}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Income</p>
          <p className="text-sm font-bold text-green-600 dark:text-green-400">{formatIDR(forecast.avgIncome)}</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Expenses</p>
          <p className="text-sm font-bold text-red-500">{formatIDR(forecast.avgExpense)}</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Net</p>
          <p className={`text-sm font-bold ${forecast.avgNet >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-500'}`}>
            {forecast.avgNet >= 0 ? '+' : ''}{formatIDR(forecast.avgNet)}
          </p>
        </div>
      </div>

      {/* Confidence explanation */}
      <div className={`mt-4 rounded-xl px-4 py-3 ${conf.bg}`}>
        <p className={`text-xs font-semibold ${conf.color} mb-1`}>
          {conf.icon} {conf.label} — what this means
        </p>
        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-1.5">
          {conf.explanation}
        </p>
        <p className={`text-xs leading-relaxed font-medium ${conf.color}`}>
          → {conf.hint}
        </p>
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 leading-relaxed">
        Simple average of the last {forecast.months} months. Excludes Transfer, Loan, and Bank Charges.
      </p>
    </div>
  )
}
