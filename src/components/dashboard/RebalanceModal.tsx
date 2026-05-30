'use client'

import { useState, useMemo, useEffect } from 'react'
import { Asset } from '@/lib/assetStorage'
import { RebalanceResult, RebalanceContext, RebalanceSavedEntry } from '@/lib/categorizer/aiCategorizer'
import { getVaultDataSync, saveVaultData } from '@/lib/storage/secureStorage'
import { ArrowRightIcon, CheckCircleIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon, MinusCircleIcon, ShieldCheckIcon, ExclamationTriangleIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline'

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

const CONFIDENCE_META: Record<string, { label: string; color: string; dot: string }> = {
  high:   { label: 'High priority',   color: 'text-green-700 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',  dot: 'bg-green-500'  },
  medium: { label: 'Consider',        color: 'text-amber-700 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',  dot: 'bg-amber-400'  },
  low:    { label: 'Optional',        color: 'text-gray-500 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700',          dot: 'bg-gray-400'   },
}

function formatIDR(n: number) {
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}jt`
  if (n >= 1_000)     return `Rp ${Math.round(n / 1_000)}rb`
  return `Rp ${Math.round(n).toLocaleString('id-ID')}`
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diffMs / 86_400_000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  return `${days} days ago`
}

function safetyVerdict(text: string): 'safe' | 'caution' | 'warning' {
  const t = text.toLowerCase()
  if (t.includes('warning')) return 'warning'
  if (t.includes('caution')) return 'caution'
  return 'safe'
}

function buildPrintHTML(r: RebalanceResult, riskPref: string): string {
  const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  const verdict = r.safetyCheck ? safetyVerdict(r.safetyCheck) : null

  const suggestionsHTML = r.suggestions.map(s => {
    const conf = CONFIDENCE_META[s.confidence] ?? CONFIDENCE_META.medium
    return `
      <div style="border:1px solid #e5e7eb;border-radius:8px;padding:14px;margin-bottom:12px;">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px;font-size:12px;">
          <span style="font-weight:700;color:#6b7280;">#${s.priority}</span>
          <span style="background:#dbeafe;color:#1d4ed8;padding:2px 8px;border-radius:4px;font-weight:700;">${s.action.toUpperCase()}</span>
          <span style="padding:2px 8px;border-radius:4px;font-weight:600;background:${s.confidence === 'high' ? '#dcfce7' : s.confidence === 'medium' ? '#fef3c7' : '#f3f4f6'};color:${s.confidence === 'high' ? '#15803d' : s.confidence === 'medium' ? '#b45309' : '#6b7280'};">${conf.label}</span>
          ${s.confidenceReason ? `<span style="color:#9ca3af;font-style:italic;">${s.confidenceReason}</span>` : ''}
        </div>
        ${s.from || s.to ? `<div style="font-size:14px;font-weight:600;margin-bottom:6px;">${s.from ?? ''}${s.from && s.to ? ' → ' : ''}${s.to ?? ''}${s.amount ? ` · Rp ${s.amount.toLocaleString('id-ID')}` : ''}</div>` : ''}
        <div style="font-size:13px;color:#4b5563;line-height:1.5;">${s.reason}</div>
      </div>`
  }).join('')

  const safetyHTML = r.safetyCheck && verdict ? `
    <div style="margin-top:20px;padding:12px;border-radius:8px;font-size:13px;line-height:1.5;
      background:${verdict === 'safe' ? '#dcfce7' : verdict === 'caution' ? '#fef3c7' : '#fee2e2'};
      color:${verdict === 'safe' ? '#15803d' : verdict === 'caution' ? '#b45309' : '#b91c1c'};
      border-left:3px solid ${verdict === 'safe' ? '#4ade80' : verdict === 'caution' ? '#fbbf24' : '#f87171'};">
      <strong>Savings Safety (${verdict}):</strong> ${r.safetyCheck}
    </div>` : ''

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Portfolio Rebalance — Fintrackr</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 700px; margin: 40px auto; padding: 0 24px; color: #111; }
    h1 { font-size: 22px; margin-bottom: 4px; }
    h2 { font-size: 16px; margin: 20px 0 12px; }
    @media print { @page { margin: 20mm; } }
  </style>
</head>
<body>
  <h1>Portfolio Rebalance Report</h1>
  <p style="color:#666;font-size:13px;margin-bottom:24px;">Generated by Fintrackr · ${dateStr} · Risk: ${riskPref.charAt(0).toUpperCase() + riskPref.slice(1)}</p>
  <div style="display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:16px;
    background:${r.overallHealth === 'poor' ? '#fee2e2' : r.overallHealth === 'fair' ? '#fef3c7' : r.overallHealth === 'good' ? '#dcfce7' : '#d1fae5'};
    color:${r.overallHealth === 'poor' ? '#b91c1c' : r.overallHealth === 'fair' ? '#b45309' : r.overallHealth === 'good' ? '#15803d' : '#065f46'};">
    ${r.overallHealth}
  </div>
  <div style="font-size:14px;line-height:1.6;background:#f8f8f8;padding:14px;border-radius:8px;margin-bottom:20px;">${r.summary}</div>
  ${r.executionNote ? `<div style="font-size:13px;line-height:1.6;background:#eff6ff;color:#1d4ed8;padding:12px;border-radius:8px;border-left:3px solid #93c5fd;margin-bottom:20px;"><strong>How to execute:</strong> ${r.executionNote}</div>` : ''}
  <h2>Suggestions</h2>
  ${suggestionsHTML}
  ${safetyHTML}
  <p style="margin-top:24px;font-size:12px;color:#9ca3af;font-style:italic;">${r.disclaimer}</p>
</body>
</html>`
}

export default function RebalanceModal({
  isOpen, onClose, statements, assets, avgMonthlyExpense, emergencyMonths, emergencyFundTotal,
}: Props) {
  const [risk, setRisk]               = useState<RiskPreference>('moderate')
  const [loading, setLoading]         = useState(false)
  const [result, setResult]           = useState<RebalanceResult | null>(null)
  const [error, setError]             = useState<string | null>(null)
  const [lastEntry, setLastEntry]     = useState<RebalanceSavedEntry | null>(null)
  const [justSaved, setJustSaved]     = useState(false)

  useEffect(() => {
    if (!isOpen) return
    const vault = getVaultDataSync()
    const history = (vault.rebalanceHistory ?? []) as RebalanceSavedEntry[]
    setLastEntry(history.length > 0 ? history[history.length - 1] : null)
  }, [isOpen])

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
    setJustSaved(false)
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

      // Auto-save to vault (capped at 5)
      const entry: RebalanceSavedEntry = {
        id: `rebalance-${Date.now()}`,
        savedAt: new Date().toISOString(),
        riskPreference: risk,
        result: data.result,
      }
      const vault = getVaultDataSync()
      const history = ([...(vault.rebalanceHistory ?? []), entry] as RebalanceSavedEntry[]).slice(-5)
      await saveVaultData({ rebalanceHistory: history })
      setLastEntry(entry)
      setJustSaved(true)
      setTimeout(() => setJustSaved(false), 3000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  function handleLoadLast() {
    if (!lastEntry) return
    setRisk(lastEntry.riskPreference)
    setResult(lastEntry.result)
    setError(null)
  }

  function exportToPDF() {
    if (!result) return
    const html = buildPrintHTML(result, risk)
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(html)
    win.document.close()
    win.print()
  }

  function handleClose() {
    setRisk('moderate')
    setResult(null)
    setError(null)
    setJustSaved(false)
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
              {/* Previous result banner */}
              {lastEntry && (
                <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3">
                  <div>
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      Last analysis: {timeAgo(lastEntry.savedAt)}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 capitalize">
                      {lastEntry.riskPreference} · {new Date(lastEntry.savedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <button
                    onClick={handleLoadLast}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Load
                  </button>
                </div>
              )}

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
                <span className={`text-xs font-bold uppercase tracking-wide ${health.color}`}>{health.label}</span>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mt-1">{result.summary}</p>
              </div>

              {/* Execution note */}
              {result.executionNote && (
                <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl px-4 py-3">
                  <svg className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                  </svg>
                  <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">{result.executionNote}</p>
                </div>
              )}

              {/* Suggestions with priority, confidence, running balance */}
              <div className="space-y-3">
                {(() => {
                  const sourceBalance: Record<string, number> = {}
                  for (const a of assets) sourceBalance[a.name] = a.currentValue

                  return result.suggestions.map((s, i) => {
                    const conf = CONFIDENCE_META[s.confidence] ?? CONFIDENCE_META.medium
                    const remaining = s.from && s.amount && sourceBalance[s.from] !== undefined
                      ? sourceBalance[s.from] - s.amount
                      : null
                    if (s.from && s.amount && sourceBalance[s.from] !== undefined) {
                      sourceBalance[s.from] = Math.max(0, sourceBalance[s.from] - s.amount)
                    }
                    const isInsufficient = remaining !== null && remaining < 0

                    return (
                      <div key={i} className={`border rounded-xl p-4 ${isInsufficient ? 'border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-900/10' : 'border-gray-100 dark:border-gray-800'}`}>
                        <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                          <span className="text-xs font-bold text-gray-400 dark:text-gray-500 w-5">#{s.priority}</span>
                          <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-lg ${ACTION_COLOR[s.action]}`}>
                            {ACTION_ICON[s.action]}
                            {s.action.charAt(0).toUpperCase() + s.action.slice(1)}
                          </span>
                          <span className={`flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-lg border ${conf.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${conf.dot}`} />
                            {conf.label}
                          </span>
                          {s.confidenceReason && (
                            <span className="text-xs text-gray-400 dark:text-gray-500 italic">{s.confidenceReason}</span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap text-sm mb-2">
                          {s.from && <span className="font-semibold text-gray-800 dark:text-gray-200">{s.from}</span>}
                          {s.from && s.to && <ArrowRightIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
                          {s.to && <span className="font-semibold text-gray-800 dark:text-gray-200">{s.to}</span>}
                          {s.amount && s.amount > 0 && (
                            <span className="text-blue-600 dark:text-blue-400 font-bold ml-1">{formatIDR(s.amount)}</span>
                          )}
                        </div>

                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-2">{s.reason}</p>

                        {remaining !== null && (
                          <div className={`flex items-center gap-1.5 text-xs mt-1 ${isInsufficient ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'}`}>
                            <span>{isInsufficient ? '⚠ Insufficient funds' : `→ ${s.from} remaining:`}</span>
                            <span className="font-semibold">{formatIDR(Math.abs(remaining))}{isInsufficient ? ' short' : ''}</span>
                          </div>
                        )}
                      </div>
                    )
                  })
                })()}
              </div>

              {/* Safety check banner */}
              {result.safetyCheck && (() => {
                const verdict = safetyVerdict(result.safetyCheck)
                const SAFETY_META = {
                  safe:    { bg: 'bg-green-50 dark:bg-green-900/20',  border: 'border-green-200 dark:border-green-800',  icon: 'text-green-500',  title: 'text-green-700 dark:text-green-300',  body: 'text-green-600 dark:text-green-400',  label: 'Savings Safety: OK' },
                  caution: { bg: 'bg-amber-50 dark:bg-amber-900/20',  border: 'border-amber-200 dark:border-amber-800',  icon: 'text-amber-500',  title: 'text-amber-700 dark:text-amber-300',  body: 'text-amber-600 dark:text-amber-400',  label: 'Savings Safety: Caution' },
                  warning: { bg: 'bg-red-50 dark:bg-red-900/20',      border: 'border-red-200 dark:border-red-800',      icon: 'text-red-500',    title: 'text-red-700 dark:text-red-300',      body: 'text-red-600 dark:text-red-400',      label: 'Savings Safety: Warning' },
                }
                const m = SAFETY_META[verdict]
                const Icon = verdict === 'safe' ? ShieldCheckIcon : ExclamationTriangleIcon
                return (
                  <div className={`flex items-start gap-2 ${m.bg} border ${m.border} rounded-xl px-4 py-3`}>
                    <Icon className={`w-4 h-4 ${m.icon} shrink-0 mt-0.5`} />
                    <div>
                      <p className={`text-xs font-semibold ${m.title} mb-0.5`}>{m.label}</p>
                      <p className={`text-xs ${m.body} leading-relaxed`}>{result.safetyCheck}</p>
                    </div>
                  </div>
                )
              })()}

              {/* Disclaimer */}
              <p className="text-xs text-gray-400 dark:text-gray-500 italic leading-relaxed">{result.disclaimer}</p>

              {/* Footer actions */}
              <div className="space-y-3">
                <button
                  onClick={exportToPDF}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 text-sm font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition"
                >
                  <DocumentArrowDownIcon className="w-5 h-5" />
                  Export Analysis to PDF
                </button>

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

                <div className="text-center">
                  <span className={`text-xs transition-opacity duration-500 ${justSaved ? 'text-green-600 dark:text-green-400 opacity-100' : 'opacity-0'}`}>
                    ✓ Analysis saved to your secure vault
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
