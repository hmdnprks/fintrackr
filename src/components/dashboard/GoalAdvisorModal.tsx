'use client'

import { useState, useMemo, useEffect } from 'react'
import { SavingsGoal } from '@/lib/goalStorage'
import { GoalAdvisorResult } from '@/lib/categorizer/aiCategorizer'
import { getVaultDataSync, saveVaultData } from '@/lib/storage/secureStorage'
import { getAssets } from '@/lib/assetStorage'
import { ArrowPathIcon } from '@heroicons/react/24/outline'

interface Props {
  isOpen: boolean
  goal: SavingsGoal
  onClose: () => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  statements: any[]
}

function formatIDRFull(n: number) {
  return `Rp ${Math.round(n).toLocaleString('id-ID')}`
}

function formatIDRShort(n: number) {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}M`
  if (n >= 1_000_000)     return `Rp ${(n / 1_000_000).toFixed(1)} jt`
  if (n >= 1_000)         return `Rp ${Math.round(n / 1_000)}rb`
  return `Rp ${Math.round(n)}`
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

const RISK_META = {
  low:      { label: 'Low',      color: 'text-green-600',  bg: 'bg-green-50 dark:bg-green-900/20',  dot: 'bg-green-500' },
  moderate: { label: 'Moderate', color: 'text-amber-600',  bg: 'bg-amber-50 dark:bg-amber-900/20',  dot: 'bg-amber-500' },
  high:     { label: 'High',     color: 'text-red-600',    bg: 'bg-red-50 dark:bg-red-900/20',      dot: 'bg-red-500'   },
}

export default function GoalAdvisorModal({ isOpen, goal, onClose, statements }: Props) {
  const [label, setLabel]     = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState<GoalAdvisorResult | null>(null)
  const [error, setError]     = useState<string | null>(null)
  const [loadedFrom, setLoadedFrom] = useState<string | null>(null)
  const [showLoadBanner, setShowLoadBanner] = useState(false)

  const months = monthsRemaining(goal.deadline)

  // Compute monthly income + expense from statements (last 6 months)
  const { avgMonthlyIncome, avgMonthlyExpense, monthlySupplus } = useMemo(() => {
    const incomeByMonth: Record<string, number> = {}
    const expenseByMonth: Record<string, number> = {}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const s of statements as any[]) {
      if (!s.monthKey) continue
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const tx of s.transactions || []) {
        if (tx.type === 'credit') {
          incomeByMonth[s.monthKey] = (incomeByMonth[s.monthKey] || 0) + (tx.amount || 0)
        } else {
          expenseByMonth[s.monthKey] = (expenseByMonth[s.monthKey] || 0) + (tx.amount || 0)
        }
      }
    }
    const recentMonths = Object.keys({ ...incomeByMonth, ...expenseByMonth })
      .sort((a, b) => b.localeCompare(a))
      .slice(0, 6)
    const n = recentMonths.length || 1
    const totalIncome  = recentMonths.reduce((s, m) => s + (incomeByMonth[m]  || 0), 0)
    const totalExpense = recentMonths.reduce((s, m) => s + (expenseByMonth[m] || 0), 0)
    const avgIncome  = totalIncome  / n
    const avgExpense = totalExpense / n
    return {
      avgMonthlyIncome:  avgIncome,
      avgMonthlyExpense: avgExpense,
      monthlySupplus:    Math.max(0, avgIncome - avgExpense),
    }
  }, [statements])

  // Current asset allocation aggregated by type
  const currentAssetAllocation = useMemo(() => {
    const assets = getAssets()
    const byType: Record<string, number> = {}
    for (const a of assets) byType[a.type] = (byType[a.type] || 0) + a.currentValue
    return Object.entries(byType).map(([type, totalValueIDR]) => ({ type, totalValueIDR }))
  }, [])

  // Check for saved history on open; pre-fill label from goal.name or prior history
  useEffect(() => {
    if (!isOpen) return
    setResult(null)
    setError(null)
    setLoadedFrom(null)
    // goal.name takes priority; fall back to last saved label
    const hist = getVaultDataSync().goalAdvisorHistory?.[goal.id] ?? []
    setShowLoadBanner(hist.length > 0)
    if (goal.name) {
      setLabel(goal.name)
    } else if (hist.length > 0 && hist[hist.length - 1].label) {
      setLabel(hist[hist.length - 1].label)
    }
  }, [isOpen, goal.id, goal.name])

  function loadPrevious() {
    const hist = getVaultDataSync().goalAdvisorHistory?.[goal.id] ?? []
    if (!hist.length) return
    const last = hist[hist.length - 1]
    setResult(last.result as GoalAdvisorResult)
    setLoadedFrom(last.savedAt)
    setLabel(last.label || '')
    setShowLoadBanner(false)
    setError(null)
  }

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    setResult(null)
    setLoadedFrom(null)

    const apiKey = getVaultDataSync().settings?.chatApiKey || undefined
    const effectiveLabel = label.trim() || `Rp ${goal.targetAmount.toLocaleString('id-ID')} goal`

    const goalAdvisorContext = {
      goalLabel:              effectiveLabel,
      targetAmount:           goal.targetAmount,
      monthsRemaining:        months,
      deadline:               goal.deadline,
      avgMonthlyIncome:       Math.round(avgMonthlyIncome),
      avgMonthlyExpense:      Math.round(avgMonthlyExpense),
      monthlySupplus:         Math.round(monthlySupplus),
      currentAssetAllocation,
    }

    try {
      const res = await fetch('/api/categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'goal-advisor', goalAdvisorContext, apiKey }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'AI request failed')

      const newResult = data.result as GoalAdvisorResult
      setResult(newResult)

      // Persist to vault — keep last 3 per goal
      const vault = getVaultDataSync()
      const existing = vault.goalAdvisorHistory?.[goal.id] ?? []
      const updated = [...existing, { savedAt: new Date().toISOString(), label: effectiveLabel, result: newResult }].slice(-3)
      await saveVaultData({ goalAdvisorHistory: { ...(vault.goalAdvisorHistory ?? {}), [goal.id]: updated } })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const requiredMonthly = months > 0 ? Math.round(goal.targetAmount / months) : goal.targetAmount
  const isAchievable    = monthlySupplus > 0 && requiredMonthly <= monthlySupplus * 0.7
  const isTight         = monthlySupplus > 0 && !isAchievable && requiredMonthly <= monthlySupplus
  const isOverdue       = months <= 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md z-10 max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 z-10">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">AI Goal Plan</h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Instrument recommendations for your savings goal</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">

          {/* Goal label */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Goal name <span className="text-gray-400 font-normal">(optional — helps AI give relevant advice)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Tabungan Haji, Wedding, New Laptop"
              value={label}
              onChange={e => setLabel(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Context summary */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Target</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">{formatIDRFull(goal.targetAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Deadline</span>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {monthLabel(goal.deadline)}
                {!isOverdue && <span className="text-gray-400 dark:text-gray-500 ml-1">({months} mo left)</span>}
              </span>
            </div>
            {monthlySupplus > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Monthly surplus</span>
                <span className="font-medium text-gray-700 dark:text-gray-300">{formatIDRShort(monthlySupplus)}</span>
              </div>
            )}
            <div className="flex justify-between pt-1 border-t border-gray-200 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400">Needed / month</span>
              <span className={`font-semibold ${isAchievable ? 'text-green-600' : isTight ? 'text-amber-600' : 'text-red-500'}`}>
                {formatIDRShort(requiredMonthly)}
              </span>
            </div>
            {!isOverdue && monthlySupplus > 0 && (
              <div className={`flex items-center gap-1.5 text-xs font-medium rounded-lg px-2 py-1.5 ${
                isAchievable ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                isTight      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                               'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
              }`}>
                {isAchievable
                  ? '✓ Achievable on current surplus'
                  : isTight
                  ? '⚠ Tight — will require most of your surplus'
                  : '✗ Goal requires more than your current surplus'}
              </div>
            )}
          </div>

          {/* Load previous banner */}
          {showLoadBanner && !result && (
            <div className="flex items-center justify-between gap-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700/50 rounded-xl px-4 py-3">
              <p className="text-xs text-indigo-700 dark:text-indigo-300">
                A previous plan is saved for this goal.
              </p>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={loadPrevious}
                  className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Load
                </button>
                <button
                  onClick={() => setShowLoadBanner(false)}
                  className="text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 rounded-xl px-4 py-3">
              <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-4">
              {loadedFrom && (
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Loaded from {new Date(loadedFrom).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              )}

              {/* Horizon tier */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full border border-indigo-200 dark:border-indigo-700/50">
                  {result.horizonTier}
                </span>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${RISK_META[result.riskLevel]?.bg} ${RISK_META[result.riskLevel]?.color} border-current/20`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${RISK_META[result.riskLevel]?.dot}`} />
                  {RISK_META[result.riskLevel]?.label} risk
                </span>
              </div>

              {/* Instruments */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Recommended instruments</p>
                {result.instruments.map((inst, i) => (
                  <div key={i} className="bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{inst.name}</p>
                      <div className="text-right shrink-0">
                        <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{inst.allocationPct}%</span>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{inst.expectedReturnRange}</p>
                      </div>
                    </div>
                    {/* Allocation bar */}
                    <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${inst.allocationPct}%` }} />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{inst.rationale}</p>
                  </div>
                ))}
              </div>

              {/* Monthly contribution */}
              <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">Required monthly contribution</p>
                  <p className="text-xs text-indigo-400 dark:text-indigo-500 mt-0.5">to reach target by {monthLabel(goal.deadline)}</p>
                </div>
                <p className="text-lg font-bold text-indigo-700 dark:text-indigo-300">{formatIDRShort(result.monthlyContribution)}<span className="text-xs font-normal text-indigo-400">/mo</span></p>
              </div>

              {/* Risk note */}
              {result.riskNote && (
                <div className={`rounded-xl px-4 py-3 ${RISK_META[result.riskLevel]?.bg}`}>
                  <p className={`text-xs leading-relaxed ${RISK_META[result.riskLevel]?.color}`}>{result.riskNote}</p>
                </div>
              )}

              {/* Summary */}
              {result.summary && (
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{result.summary}</p>
              )}
            </div>
          )}

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={loading || isOverdue}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                Analysing goal…
              </>
            ) : result ? 'Regenerate Plan' : 'Generate Plan'}
          </button>
          {isOverdue && (
            <p className="text-xs text-center text-gray-400 dark:text-gray-500">Deadline has passed — no plan can be generated.</p>
          )}

        </div>
      </div>
    </div>
  )
}
