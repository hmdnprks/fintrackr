'use client'

import { useState, useMemo } from 'react'
import { Asset } from '@/lib/assetStorage'
import { RebalanceResult, RebalanceContext } from '@/lib/categorizer/aiCategorizer'
import { getVaultDataSync } from '@/lib/storage/secureStorage'
import { ArrowRightIcon, CheckCircleIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon, MinusCircleIcon } from '@heroicons/react/24/outline'

type RiskPreference = 'conservative' | 'moderate' | 'aggressive'

interface Props {
  isOpen: boolean
  onClose: () => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  statements: any[]
  assets: Asset[]
  avgMonthlyExpense: number
  emergencyMonths: number | null
  emergencyFundTotal: number
}

const RISK_OPTIONS: { id: RiskPreference; label: string; desc: string }[] = [
  { id: 'conservative', label: 'Conservative', desc: 'Prioritise stability — deposito, reksa dana pasar uang' },
  { id: 'moderate',     label: 'Moderate',     desc: 'Balanced growth — mix of fixed income and equity' },
  { id: 'aggressive',   label: 'Aggressive',   desc: 'Maximise growth — reksa dana saham, higher risk' },
]

const HEALTH_META: Record<string, { label: string; color: string; bg: string }> = {
  poor:      { label: 'Needs Attention', color: 'text-red-600',    bg: 'bg-red-50 dark:bg-red-900/20'      },
  fair:      { label: 'Fair',            color: 'text-amber-600',  bg: 'bg-amber-50 dark:bg-amber-900/20'  },
  good:      { label: 'Good',            color: 'text-green-600',  bg: 'bg-green-50 dark:bg-green-900/20'  },
  excellent: { label: 'Excellent',       color: 'text-emerald-600',bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
}

const ACTION_ICON = {
  move:     <ArrowRightIcon className="w-4 h-4" />,
  increase: <ArrowTrendingUpIcon className="w-4 h-4" />,
  reduce:   <ArrowTrendingDownIcon className="w-4 h-4" />,
  maintain: <CheckCircleIcon className="w-4 h-4" />,
}

const ACTION_COLOR: Record<string, string> = {
  move:     'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
  increase: 'text-green-600 bg-green-50 dark:bg-green-900/20',
  reduce:   'text-amber-600 bg-amber-50 dark:bg-amber-900/20',
  maintain: 'text-gray-500 bg-gray-100 dark:bg-gray-800',
}

function formatIDR(n: number) {
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}jt`
  if (n >= 1_000)     return `Rp ${Math.round(n / 1_000)}rb`
  return `Rp ${Math.round(n).toLocaleString('id-ID')}`
}

export default function RebalanceModal({
  isOpen, onClose, statements, assets, avgMonthlyExpense, emergencyMonths, emergencyFundTotal,
}: Props) {
  const [risk, setRisk]       = useState<RiskPreference>('moderate')
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState<RebalanceResult | null>(null)
  const [error, setError]     = useState<string | null>(null)

  const avgMonthlyIncome = useMemo(() => {
    if (!statements.length) return 0
    const map: Record<string, number> = {}
    for (const s of statements) {
      if (!s.monthKey) continue
      for (const tx of s.transactions || []) {
        if (tx.type === 'credit') map[s.monthKey] = (map[s.monthKey] || 0) + (tx.amount || 0)
      }
    }
    const recent = Object.entries(map).sort(([a], [b]) => b.localeCompare(a)).slice(0, 6).map(([, v]) => v)
    return recent.length ? recent.reduce((s, v) => s + v, 0) / recent.length : 0
  }, [statements])

  const totalNetWorth = assets.reduce((s, a) => s + a.currentValue, 0)
  const byType: Record<string, number> = {}
  for (const a of assets) byType[a.type] = (byType[a.type] || 0) + a.currentValue

  function buildContext(): RebalanceContext {
    const TARGET_MONTHS = 6
    const efGap = Math.max(0, (TARGET_MONTHS - (emergencyMonths ?? 0)) * avgMonthlyExpense)
    const totalLiquid = assets.filter(a => a.type === 'savings').reduce((s, a) => s + a.currentValue, 0)

    return {
      riskPreference: risk,
      income:   { avgMonthly: Math.round(avgMonthlyIncome) },
      expenses: { avgMonthly: Math.round(avgMonthlyExpense) },
      emergencyFund: {
        currentMonths: Math.round((emergencyMonths ?? 0) * 10) / 10,
        targetMonths:  TARGET_MONTHS,
        gapAmount:     Math.round(efGap),
        accounts:      assets.filter(a => a.type === 'savings' && a.isEmergencyFund).map(a => a.name),
      },
      liquidCoverage: { months: avgMonthlyExpense > 0 ? totalLiquid / avgMonthlyExpense : 0, totalLiquid },
      assets: {
        totalNetWorth,
        byType,
        items: assets.map(a => ({
          name: a.name, institution: a.institution, type: a.type,
          currentValue: a.currentValue, interestRate: a.interestRate,
          isEmergencyFund: a.isEmergencyFund, contributable: a.contributable,
          platform: a.platform,
        })),
      },
    }
  }

  async function handleAnalyse() {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const rebalanceContext = buildContext()
      const apiKey = getVaultDataSync().settings?.chatApiKey || undefined
      const res = await fetch('/api/categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'rebalance', rebalanceContext, apiKey }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Analysis failed')
      setResult(data.result)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setRisk('moderate')
    setResult(null)
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  const health = result ? HEALTH_META[result.overallHealth] ?? HEALTH_META.fair : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={loading ? undefined : handleClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg z-10 max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Rebalance My Portfolio</h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">AI analyses your current assets and suggests restructuring</p>
          </div>
          <button onClick={handleClose} disabled={loading} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 transition">
            <MinusCircleIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* Input — risk preference */}
          {!result && !loading && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Your risk appetite</label>
                <div className="space-y-2">
                  {RISK_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setRisk(opt.id)}
                      className={`w-full text-left px-4 py-3 rounded-xl border transition ${
                        risk === opt.id
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <p className="text-sm font-semibold">{opt.label}</p>
                      <p className={`text-xs mt-0.5 ${risk === opt.id ? 'text-blue-100' : 'text-gray-400 dark:text-gray-500'}`}>{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Current snapshot */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-xs space-y-1.5">
                <p className="font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-2">Current allocation</p>
                {Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([type, val]) => (
                  <div key={type} className="flex justify-between text-gray-500 dark:text-gray-400">
                    <span className="capitalize">{type}</span>
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      {formatIDR(val)} · {totalNetWorth > 0 ? Math.round((val / totalNetWorth) * 100) : 0}%
                    </span>
                  </div>
                ))}
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}

              <button
                onClick={handleAnalyse}
                disabled={assets.length === 0}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-40 transition flex items-center justify-center gap-2"
              >
                <ArrowTrendingUpIcon className="w-4 h-4" />
                Analyse My Portfolio
              </button>
            </>
          )}

          {/* Loading */}
          {loading && (
            <div className="text-center py-10">
              <div className="inline-block w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Analysing your portfolio…</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">AI is reviewing your allocation vs your {risk} risk preference</p>
            </div>
          )}

          {/* Result */}
          {result && !loading && health && (
            <div className="space-y-4">
              {/* Health badge + summary */}
              <div className={`rounded-xl p-4 ${health.bg}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-bold uppercase tracking-wide ${health.color}`}>{health.label}</span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{result.summary}</p>
              </div>

              {/* Suggestions */}
              <div className="space-y-3">
                {result.suggestions.map((s, i) => (
                  <div key={i} className="border border-gray-100 dark:border-gray-800 rounded-xl p-4">
                    {/* Action badge + from → to */}
                    <div className="flex items-start gap-3 mb-2">
                      <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg shrink-0 ${ACTION_COLOR[s.action]}`}>
                        {ACTION_ICON[s.action]}
                        {s.action.charAt(0).toUpperCase() + s.action.slice(1)}
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap min-w-0 text-sm">
                        {s.from && <span className="font-medium text-gray-800 dark:text-gray-200">{s.from}</span>}
                        {s.from && s.to && <ArrowRightIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
                        {s.to && <span className="font-medium text-gray-800 dark:text-gray-200">{s.to}</span>}
                        {s.amount && s.amount > 0 && (
                          <span className="text-blue-600 dark:text-blue-400 font-semibold ml-1">{formatIDR(s.amount)}</span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{s.reason}</p>
                  </div>
                ))}
              </div>

              {/* Disclaimer */}
              <p className="text-xs text-gray-400 dark:text-gray-500 italic leading-relaxed">{result.disclaimer}</p>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => { setResult(null); setError(null) }}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  Reanalyse
                </button>
                <button
                  onClick={handleClose}
                  className="flex-1 py-2.5 rounded-xl bg-gray-900 dark:bg-gray-700 hover:bg-black dark:hover:bg-gray-600 text-white text-sm font-medium transition"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
