'use client'

import { useState, useMemo, useEffect } from 'react'
import { jsPDF } from 'jspdf'
import { Asset } from '@/lib/assetStorage'
import { getLiabilities } from '@/lib/liabilityStorage'
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
  const d = new Date(iso)
  const dateStr = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  const timeStr = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  return `${dateStr} ${timeStr}`
}

function exportRebalancePDF(r: RebalanceResult, riskPref: string) {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageW   = doc.internal.pageSize.getWidth()
  const pageH   = doc.internal.pageSize.getHeight()
  const margin  = 14
  const usable  = pageW - margin * 2
  let y = margin

  function ensureSpace(needed: number) {
    if (y + needed > pageH - margin) {
      doc.addPage()
      y = margin
    }
  }

  function txt(
    text: string,
    size: number,
    rgb: [number, number, number],
    bold = false,
    x = margin,
    wrap = usable,
  ): number {
    doc.setFontSize(size)
    doc.setTextColor(rgb[0], rgb[1], rgb[2])
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    const lines = doc.splitTextToSize(text, wrap)
    doc.text(lines, x, y)
    const added = (lines.length * size * 0.3527) + 1.5
    y += added
    return added
  }

  function filledBox(
    bx: number, bw: number, bh: number,
    fillRgb: [number, number, number],
    strokeRgb?: [number, number, number],
  ) {
    doc.setFillColor(fillRgb[0], fillRgb[1], fillRgb[2])
    if (strokeRgb) {
      doc.setDrawColor(strokeRgb[0], strokeRgb[1], strokeRgb[2])
      doc.setLineWidth(0.3)
      doc.roundedRect(bx, y, bw, bh, 1.5, 1.5, 'FD')
    } else {
      doc.roundedRect(bx, y, bw, bh, 1.5, 1.5, 'F')
    }
  }

  const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })

  // ── Title ─────────────────────────────────────────────────────────────────
  txt('Portfolio Rebalance Report', 16, [17, 24, 39], true)
  txt(`Fintrackr Analysis  ·  ${dateStr}  ·  Risk: ${riskPref.charAt(0).toUpperCase() + riskPref.slice(1)}`, 8, [107, 114, 128])
  y += 2

  // ── Health badge ──────────────────────────────────────────────────────────
  const healthRgb: [number, number, number] =
    r.overallHealth === 'poor'      ? [185, 28, 28] :
    r.overallHealth === 'fair'      ? [180, 83,  9] :
    r.overallHealth === 'good'      ? [21, 128, 61] : [6, 95, 70]
  txt(`Portfolio Health: ${r.overallHealth.toUpperCase()}`, 9, healthRgb, true)
  y += 3

  // ── Assessment box ────────────────────────────────────────────────────────
  const summaryLines = doc.splitTextToSize(r.summary, usable - 6)
  const summaryH = summaryLines.length * (9 * 0.3527) + 10
  ensureSpace(summaryH)
  filledBox(margin, usable, summaryH, [249, 250, 251], [229, 231, 235])
  const savedY = y
  y += 4
  txt('ASSESSMENT', 7, [107, 114, 128], true, margin + 3, usable - 6)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(31, 41, 55)
  doc.text(summaryLines, margin + 3, y)
  y = savedY + summaryH + 3

  // ── Execution note ────────────────────────────────────────────────────────
  if (r.executionNote) {
    const noteLines = doc.splitTextToSize(r.executionNote, usable - 6)
    const noteH = noteLines.length * (8 * 0.3527) + 10
    ensureSpace(noteH)
    filledBox(margin, usable, noteH, [239, 246, 255])
    doc.setDrawColor(59, 130, 246)
    doc.setLineWidth(0.8)
    doc.line(margin, y, margin, y + noteH)
    const noteY = y
    y += 4
    txt('EXECUTION', 7, [29, 78, 216], true, margin + 4, usable - 8)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(29, 78, 216)
    doc.text(noteLines, margin + 4, y)
    y = noteY + noteH + 3
  }

  // ── Section header: Suggestions ───────────────────────────────────────────
  ensureSpace(10)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(55, 65, 81)
  doc.text('STRATEGIC SUGGESTIONS', margin, y)
  doc.setDrawColor(229, 231, 235)
  doc.setLineWidth(0.3)
  doc.line(margin, y + 1.5, margin + usable, y + 1.5)
  y += 6

  // ── Suggestion cards ──────────────────────────────────────────────────────
  for (const s of r.suggestions) {
    const reasonLines = doc.splitTextToSize(s.reason, usable - 6)
    const hasFromTo   = !!(s.from || s.to)
    const cardH = 7 + (hasFromTo ? 5.5 : 0) + reasonLines.length * (8 * 0.3527) + 4
    ensureSpace(cardH)

    filledBox(margin, usable, cardH, [249, 250, 251], [229, 231, 235])
    const cardTop = y
    y += 4

    // Priority
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(107, 114, 128)
    doc.text(`#${s.priority}`, margin + 3, y)

    // Action badge
    const actionRgb: [number, number, number] =
      s.action === 'increase' ? [21, 128, 61] :
      s.action === 'reduce'   ? [180, 83, 9]  :
      s.action === 'move'     ? [29, 78, 216] : [107, 114, 128]
    doc.setTextColor(actionRgb[0], actionRgb[1], actionRgb[2])
    doc.text(s.action.toUpperCase(), margin + 13, y)

    // Confidence badge
    const confRgb: [number, number, number] =
      s.confidence === 'high'   ? [21, 128, 61] :
      s.confidence === 'medium' ? [180, 83, 9]  : [107, 114, 128]
    const confLabel =
      s.confidence === 'high'   ? 'HIGH PRIORITY' :
      s.confidence === 'medium' ? 'CONSIDER'       : 'OPTIONAL'
    doc.setTextColor(confRgb[0], confRgb[1], confRgb[2])
    doc.text(confLabel, margin + 38, y)
    y += 4.5

    // From → To · Amount
    if (hasFromTo) {
      const fromTo = `${s.from ?? ''}${s.from && s.to ? ' → ' : ''}${s.to ?? ''}${s.amount ? `  ·  Rp ${s.amount.toLocaleString('id-ID')}` : ''}`
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(17, 24, 39)
      doc.text(doc.splitTextToSize(fromTo, usable - 6), margin + 3, y)
      y += 5.5
    }

    // Reason
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(75, 85, 99)
    doc.text(reasonLines, margin + 3, y)
    y = cardTop + cardH + 3
  }

  // ── Safety check ──────────────────────────────────────────────────────────
  const verdict    = r.safetyCheck.verdict
  const safetyText = `After rebalancing, remaining daily operational cash will be Rp ${r.safetyCheck.remainingLiquidAmount.toLocaleString('id-ID')} — covering ~${r.safetyCheck.monthsCovered.toFixed(1)} months of expenses. ${r.safetyCheck.analysis}`
  const safetyLines = doc.splitTextToSize(safetyText, usable - 6)
  const safetyH     = safetyLines.length * (8 * 0.3527) + 11
  ensureSpace(safetyH)

  const safetyFill: [number, number, number] =
    verdict === 'safe'    ? [220, 252, 231] :
    verdict === 'caution' ? [254, 243, 199] : [254, 226, 226]
  const safetyRgb: [number, number, number] =
    verdict === 'safe'    ? [21, 128, 61]   :
    verdict === 'caution' ? [180, 83, 9]    : [185, 28, 28]

  filledBox(margin, usable, safetyH, safetyFill)
  doc.setDrawColor(safetyRgb[0], safetyRgb[1], safetyRgb[2])
  doc.setLineWidth(0.8)
  doc.line(margin, y, margin, y + safetyH)
  const safetyTop = y
  y += 4
  txt(`DAILY CASH SAFETY (${verdict.toUpperCase()})`, 7.5, safetyRgb, true, margin + 4, usable - 8)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(safetyRgb[0], safetyRgb[1], safetyRgb[2])
  doc.text(safetyLines, margin + 4, y)
  y = safetyTop + safetyH + 5

  // ── Disclaimer ────────────────────────────────────────────────────────────
  ensureSpace(8)
  doc.setDrawColor(229, 231, 235)
  doc.setLineWidth(0.3)
  doc.setLineDashPattern([1.5, 1.5], 0)
  doc.line(margin, y, margin + usable, y)
  doc.setLineDashPattern([], 0)
  y += 3
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(156, 163, 175)
  doc.text(
    doc.splitTextToSize(`${r.disclaimer} · Personal Finance Tracker locally stored in browser`, usable),
    margin, y,
  )

  const filename = `rebalance-report-${new Date().toISOString().slice(0, 10)}.pdf`
  doc.save(filename)
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

  const totalLiabilities = getLiabilities().reduce((s, l) => s + l.remainingBalance, 0)
  const totalNetWorth = assets.reduce((s, a) => s + a.currentValue, 0) - totalLiabilities
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
    exportRebalancePDF(result, risk)
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
                      Risk: {lastEntry.riskPreference}
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
              {(() => {
                const verdict = result.safetyCheck.verdict
                const SAFETY_META = {
                  safe:    { bg: 'bg-green-50 dark:bg-green-900/20',  border: 'border-green-200 dark:border-green-800',  icon: 'text-green-500',  title: 'text-green-700 dark:text-green-300',  body: 'text-green-600 dark:text-green-400',  label: 'Daily Cash Safety: OK' },
                  caution: { bg: 'bg-amber-50 dark:bg-amber-900/20',  border: 'border-amber-200 dark:border-amber-800',  icon: 'text-amber-500',  title: 'text-amber-700 dark:text-amber-300',  body: 'text-amber-600 dark:text-amber-400',  label: 'Daily Cash Safety: Caution' },
                  warning: { bg: 'bg-red-50 dark:bg-red-900/20',      border: 'border-red-200 dark:border-red-800',      icon: 'text-red-500',    title: 'text-red-700 dark:text-red-300',      body: 'text-red-600 dark:text-red-400',      label: 'Daily Cash Safety: Critical' },
                }
                const m = SAFETY_META[verdict]
                const Icon = verdict === 'safe' ? ShieldCheckIcon : ExclamationTriangleIcon
                return (
                  <div className={`flex items-start gap-2 ${m.bg} border ${m.border} rounded-xl px-4 py-3`}>
                    <Icon className={`w-4 h-4 ${m.icon} shrink-0 mt-0.5`} />
                    <div>
                      <p className={`text-xs font-semibold ${m.title} mb-0.5`}>{m.label}</p>
                      <p className={`text-xs ${m.body} leading-relaxed`}>
                        After rebalancing, remaining daily operational cash will be <span className="font-bold">Rp {result.safetyCheck.remainingLiquidAmount.toLocaleString('id-ID')}</span> — covering <span className="font-bold">~{result.safetyCheck.monthsCovered.toFixed(1)} months</span> of expenses. {result.safetyCheck.analysis}
                      </p>
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
