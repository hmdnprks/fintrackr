'use client'

import { useState } from 'react'
import { getAssets, Asset } from '@/lib/assetStorage'

interface Props {
  savingsRateTrend: { income: number; expense: number; rate: number }[]
  investmentRate: number
  budgets: Record<string, number>
  currentMonthSpending: Record<string, number>
}

interface DimResult {
  pts: number
  max: number
  detail: string
}

const DIMENSIONS = ['Savings Rate', 'Emergency Fund', 'Investment Rate', 'Budget Adherence']

function scoreSavings(trend: { rate: number }[]): DimResult {
  const recent = trend.slice(-6)
  if (!recent.length) return { pts: 0, max: 30, detail: 'No statement data yet' }
  const avg = Math.round(recent.reduce((s, d) => s + d.rate, 0) / recent.length)
  const pts = avg >= 20 ? 30 : avg >= 15 ? 24 : avg >= 10 ? 17 : avg >= 5 ? 10 : avg > 0 ? 4 : 0
  return { pts, max: 30, detail: `${avg}% avg savings rate · last ${recent.length} month${recent.length !== 1 ? 's' : ''}` }
}

function scoreEmergencyFund(assets: Asset[], avgExpense: number): DimResult {
  if (!assets.length) return { pts: 0, max: 30, detail: 'Set up Assets tab to track' }
  if (avgExpense <= 0)  return { pts: 0, max: 30, detail: 'No expense data to compute' }
  const efTotal = assets
    .filter(a => a.isEmergencyFund && a.type === 'savings')
    .reduce((s, a) => s + a.currentValue, 0)
  if (efTotal === 0) return { pts: 0, max: 30, detail: 'No emergency fund assets marked' }
  const months = efTotal / avgExpense
  const pts = months >= 6 ? 30 : months >= 3 ? 20 : months >= 1 ? 10 : 0
  return { pts, max: 30, detail: `${months.toFixed(1)} months covered` }
}

function scoreInvestment(rate: number): DimResult {
  const pts = rate >= 20 ? 20 : rate >= 15 ? 16 : rate >= 10 ? 11 : rate >= 5 ? 6 : rate > 0 ? 3 : 0
  const detail = rate > 0 ? `${rate}% of income directed to investments` : 'No investment transfers detected'
  return { pts, max: 20, detail }
}

function scoreBudget(budgets: Record<string, number>, spending: Record<string, number>): DimResult {
  const entries = Object.entries(budgets).filter(([, v]) => v > 0)
  if (!entries.length) return { pts: 10, max: 20, detail: 'No budgets set — score is neutral' }
  const under = entries.filter(([cat, limit]) => (spending[cat] || 0) <= limit).length
  const pts = Math.round(20 * under / entries.length)
  return { pts, max: 20, detail: `${under} of ${entries.length} categories on track this month` }
}

function grade(score: number) {
  if (score >= 90) return { letter: 'A+', label: 'Excellent',  color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', message: "Outstanding! Your finances are in excellent shape — keep the habits going." }
  if (score >= 80) return { letter: 'A',  label: 'Great',      color: 'text-green-600 dark:text-green-400',   bg: 'bg-green-50 dark:bg-green-900/20',   message: "Great work! You're well on track. Push toward 90+ by boosting your weakest dimension." }
  if (score >= 70) return { letter: 'B',  label: 'Good',       color: 'text-blue-600 dark:text-blue-400',     bg: 'bg-blue-50 dark:bg-blue-900/20',     message: "Solid foundation. A few targeted improvements could push you into the A range." }
  if (score >= 55) return { letter: 'C',  label: 'Fair',       color: 'text-amber-600 dark:text-amber-400',   bg: 'bg-amber-50 dark:bg-amber-900/20',   message: "Making progress. Focus on the lowest-scoring dimensions below." }
  return              { letter: 'D',  label: 'Needs Work', color: 'text-red-600 dark:text-red-400',       bg: 'bg-red-50 dark:bg-red-900/20',       message: "There's real opportunity here. Even one dimension improved significantly can move the needle." }
}

function barColor(pct: number) {
  return pct >= 75 ? 'bg-green-500' : pct >= 45 ? 'bg-amber-400' : 'bg-red-400'
}

export default function FinancialHealthScore({
  savingsRateTrend, investmentRate, budgets, currentMonthSpending,
}: Props) {
  const [assets] = useState<Asset[]>(() => getAssets())

  const avgMonthlyExpense = savingsRateTrend.length
    ? savingsRateTrend.reduce((s, d) => s + d.expense, 0) / savingsRateTrend.length
    : 0

  const dims: DimResult[] = [
    scoreSavings(savingsRateTrend),
    scoreEmergencyFund(assets, avgMonthlyExpense),
    scoreInvestment(investmentRate),
    scoreBudget(budgets, currentMonthSpending),
  ]

  const totalScore = dims.reduce((s, d) => s + d.pts, 0)
  const g = grade(totalScore)

  const hasAnyData = savingsRateTrend.length > 0 || assets.length > 0

  return (
    <div className="bg-white dark:bg-gray-900 dark:border dark:border-gray-800 p-6 rounded-2xl shadow-sm">
      {/* Header row */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Financial Health Score</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            Composite score across savings, emergency fund, investments, and budget
          </p>
        </div>

        {hasAnyData && (
          <div className="text-right shrink-0 ml-4">
            <div className="flex items-end gap-1.5 justify-end">
              <span className={`text-4xl font-black leading-none ${g.color}`}>{totalScore}</span>
              <span className="text-gray-300 dark:text-gray-600 text-xl font-light mb-0.5">/100</span>
            </div>
            <div className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold mt-1.5 ${g.bg} ${g.color}`}>
              {g.letter} · {g.label}
            </div>
          </div>
        )}
      </div>

      {!hasAnyData ? (
        <div className="text-center py-6 text-gray-400 dark:text-gray-500 text-sm">
          Import statements and set up the Assets tab to see your health score.
        </div>
      ) : (
        <>
          {/* Motivating message */}
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-5">{g.message}</p>

          {/* Dimension breakdown */}
          <div className="space-y-4">
            {dims.map((dim, i) => {
              const pct = (dim.pts / dim.max) * 100
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{DIMENSIONS[i]}</span>
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                      {dim.pts}<span className="font-normal text-gray-300 dark:text-gray-600">/{dim.max}</span>
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${barColor(pct)}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{dim.detail}</p>
                </div>
              )
            })}
          </div>

          {/* Score breakdown note */}
          <p className="text-xs text-gray-300 dark:text-gray-600 mt-5 leading-relaxed">
            Savings Rate (30 pts) · Emergency Fund (30 pts) · Investment Rate (20 pts) · Budget Adherence (20 pts)
          </p>
        </>
      )}
    </div>
  )
}
