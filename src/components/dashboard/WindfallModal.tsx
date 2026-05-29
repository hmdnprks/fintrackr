'use client'

import { useState, useMemo } from 'react'
import { Asset } from '@/lib/assetStorage'
import { WindfallResult, WindfallContext } from '@/lib/categorizer/aiCategorizer'
import { getVaultDataSync } from '@/lib/storage/secureStorage'

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

const WINDFALL_TYPES = [
  { id: 'bonus',     label: 'Bonus',     desc: 'Annual / performance bonus' },
  { id: 'thr',       label: 'THR',       desc: 'Tunjangan Hari Raya' },
  { id: 'freelance', label: 'Freelance', desc: 'Project / side income' },
  { id: 'other',     label: 'Other',     desc: 'Any other windfall' },
]

function formatThousands(n: number) {
  return new Intl.NumberFormat('id-ID').format(n)
}

function formatIDRFull(n: number) {
  return `Rp ${Math.round(n).toLocaleString('id-ID')}`
}

export default function WindfallModal({
  isOpen,
  onClose,
  statements,
  assets,
  avgMonthlyExpense,
  emergencyMonths,
  emergencyFundTotal,
}: Props) {
  const [amount, setAmount]     = useState('')
  const [wfType, setWfType]     = useState('bonus')
  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState<WindfallResult | null>(null)
  const [error, setError]       = useState<string | null>(null)

  const rawAmount = Number(amount.replace(/[^0-9]/g, ''))

  // Average monthly income from the 6 most recent months
  const avgMonthlyIncome = useMemo(() => {
    if (!statements.length) return 0
    const monthlyTotals: Record<string, number> = {}
    for (const s of statements) {
      if (!s.monthKey) continue
      let total = 0
      for (const tx of s.transactions || []) {
        if (tx.type === 'credit') total += tx.amount || 0
      }
      if (total > 0) monthlyTotals[s.monthKey] = total
    }
    const recent = Object.entries(monthlyTotals)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 6)
      .map(([, v]) => v)
    if (!recent.length) return 0
    return recent.reduce((s, v) => s + v, 0) / recent.length
  }, [statements])

  // Map destination name → gap amount so result cards can show gap fill progress
  const gapMap = useMemo(() => {
    const map: Record<string, number> = {}
    const efGap = emergencyMonths !== null && avgMonthlyExpense > 0
      ? Math.max(0, (6 - emergencyMonths) * avgMonthlyExpense)
      : 0
    assets.filter(a => a.type === 'savings' && a.isEmergencyFund)
      .forEach(a => { map[a.name] = efGap })
    assets.filter(a => a.type === 'pocket' && a.goalTarget)
      .forEach(a => { map[a.name] = Math.max(0, (a.goalTarget ?? 0) - a.currentValue) })
    return map
  }, [assets, emergencyMonths, avgMonthlyExpense])

  function buildContext(): WindfallContext {
    const EXCLUDE = new Set(['Transfer', 'Bank Charges'])
    const TARGET_MONTHS = 6
    const efGap = Math.max(0, (TARGET_MONTHS - (emergencyMonths ?? 0)) * avgMonthlyExpense)

    const efAccounts = assets
      .filter(a => a.type === 'savings' && a.isEmergencyFund)
      .map(a => ({ name: a.name, institution: a.institution }))

    const pockets = assets
      .filter(a => a.type === 'pocket')
      .map(a => ({
        name: a.name,
        goalName: a.goalName,
        currentValue: a.currentValue,
        goalTarget: a.goalTarget,
        goalDeadline: a.goalDeadline,
        gapAmount: a.goalTarget ? Math.max(0, a.goalTarget - a.currentValue) : 0,
      }))

    const investments = assets
      .filter(a => a.type === 'investment' && a.contributable !== false)
      .map(a => ({
        name: a.name,
        institution: a.institution,
        currentValue: a.currentValue,
        platform: a.platform,
      }))

    const byType: Record<string, number> = {}
    for (const a of assets) {
      byType[a.type] = (byType[a.type] || 0) + a.currentValue
    }
    const totalNetWorth = Object.values(byType).reduce((s, v) => s + v, 0)

    return {
      windfall: { amount: rawAmount, type: wfType },
      income:   { avgMonthly: Math.round(avgMonthlyIncome) },
      expenses: { avgMonthly: Math.round(avgMonthlyExpense) },
      emergencyFund: {
        currentMonths: Math.round((emergencyMonths ?? 0) * 10) / 10,
        targetMonths: TARGET_MONTHS,
        gapAmount: Math.round(efGap),
        accounts: efAccounts,
      },
      assets: { totalNetWorth, byType, pockets, investments },
    }
  }

  async function handleGenerate() {
    if (!rawAmount) return
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const context = buildContext()
      const apiKey = getVaultDataSync().settings?.chatApiKey || undefined

      const res = await fetch('/api/categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'windfall-allocation', context, apiKey }),
      })

      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Failed to generate allocation')
      setResult(data.result)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setAmount('')
    setWfType('bonus')
    setResult(null)
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={loading ? undefined : handleClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg z-10 max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Allocate Windfall</h3>
            <p className="text-xs text-gray-400 mt-0.5">AI will suggest where to put this money based on your financial profile</p>
          </div>
          <button onClick={handleClose} disabled={loading} className="text-gray-400 hover:text-gray-600 transition disabled:opacity-30">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">

          {!result && !loading && (
            <>
              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type of windfall</label>
                <div className="grid grid-cols-2 gap-2">
                  {WINDFALL_TYPES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setWfType(t.id)}
                      className={`text-left px-3 py-2.5 rounded-xl border text-sm transition ${
                        wfType === t.id
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="font-medium">{t.label}</p>
                      <p className={`text-xs mt-0.5 ${wfType === t.id ? 'text-blue-100' : 'text-gray-400'}`}>{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount received</label>
                <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
                  <span className="px-3 py-3 text-sm text-gray-400 bg-gray-50 border-r border-gray-200 select-none">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={amount}
                    onChange={e => {
                      const digits = e.target.value.replace(/[^0-9]/g, '')
                      setAmount(digits ? formatThousands(Number(digits)) : '')
                    }}
                    className="flex-1 px-3 py-3 text-sm focus:outline-none bg-transparent min-w-0"
                  />
                </div>
              </div>

              {/* Context summary */}
              {(avgMonthlyExpense > 0 || assets.length > 0) && (
                <div className="bg-gray-50 rounded-xl p-4 space-y-1.5">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Your financial snapshot</p>
                  {avgMonthlyExpense > 0 && (
                    <p className="text-xs text-gray-600">Avg monthly expenses: <span className="font-medium text-gray-800">{formatIDRFull(avgMonthlyExpense)}</span></p>
                  )}
                  {avgMonthlyIncome > 0 && (
                    <p className="text-xs text-gray-600">Avg monthly income: <span className="font-medium text-gray-800">{formatIDRFull(avgMonthlyIncome)}</span></p>
                  )}
                  {emergencyMonths !== null && (
                    <p className="text-xs text-gray-600">Emergency fund: <span className={`font-medium ${emergencyMonths >= 6 ? 'text-green-600' : emergencyMonths >= 3 ? 'text-amber-600' : 'text-red-500'}`}>{emergencyMonths.toFixed(1)} months</span></p>
                  )}
                  {assets.filter(a => a.type === 'pocket' && a.goalTarget).length > 0 && (
                    <p className="text-xs text-gray-600">Active goal pockets: <span className="font-medium text-gray-800">{assets.filter(a => a.type === 'pocket' && a.goalTarget).length}</span></p>
                  )}
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={!rawAmount}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                Get AI Allocation Plan
              </button>
            </>
          )}

          {/* Loading */}
          {loading && (
            <div className="text-center py-10">
              <div className="inline-block w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4" />
              <p className="text-sm font-medium text-gray-700">Analysing your financial profile…</p>
              <p className="text-xs text-gray-400 mt-1">DeepSeek is computing the best allocation for your situation</p>
            </div>
          )}

          {/* Result */}
          {result && !loading && (
            <div className="space-y-4">
              {/* Windfall amount header */}
              <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                <div>
                  <p className="text-xs text-blue-500 font-medium uppercase tracking-wide">{WINDFALL_TYPES.find(t => t.id === wfType)?.label}</p>
                  <p className="text-xl font-bold text-blue-700">{formatIDRFull(rawAmount)}</p>
                </div>
                <svg className="w-8 h-8 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75" />
                </svg>
              </div>

              {/* Summary */}
              <p className="text-sm text-gray-600 leading-relaxed">{result.summary}</p>

              {/* Allocations */}
              <div className="space-y-3">
                {result.allocations.map((a, i) => {
                  const windfallPct = rawAmount > 0 ? Math.min(100, Math.round((a.amount / rawAmount) * 100)) : 0
                  const gap         = gapMap[a.destination] ?? 0
                  const gapFillPct  = gap > 0 ? Math.min(100, Math.round((a.amount / gap) * 100)) : null
                  const stillNeeded = gap > 0 ? Math.max(0, gap - a.amount) : null
                  return (
                    <div key={i} className="border border-gray-100 rounded-xl p-4 space-y-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold text-gray-900">{a.destination}</p>
                        <p className="text-sm font-bold text-blue-700 shrink-0">{formatIDRFull(a.amount)}</p>
                      </div>

                      {/* Bar 1 — % of windfall */}
                      <div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-400 rounded-full" style={{ width: `${windfallPct}%` }} />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{windfallPct}% of your windfall goes here</p>
                      </div>

                      {/* Bar 2 — gap fill progress (only when gap is known) */}
                      {gapFillPct !== null && (
                        <div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${gapFillPct >= 100 ? 'bg-green-400' : 'bg-amber-400'}`}
                              style={{ width: `${gapFillPct}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-xs text-gray-400">fills {gapFillPct}% of the gap</p>
                            {stillNeeded !== null && stillNeeded > 0 && (
                              <p className="text-xs text-gray-400">{formatIDRFull(stillNeeded)} still needed</p>
                            )}
                            {gapFillPct >= 100 && (
                              <p className="text-xs text-green-600 font-medium">gap fully covered ✓</p>
                            )}
                          </div>
                        </div>
                      )}

                      <p className="text-xs text-gray-500 leading-relaxed">{a.reason}</p>
                    </div>
                  )
                })}
              </div>

              {/* Leftover */}
              {result.leftover > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold text-gray-700">Remainder</p>
                    <p className="text-sm font-bold text-gray-900">{formatIDRFull(result.leftover)}</p>
                  </div>
                  {result.leftoverAdvice && (
                    <p className="text-xs text-gray-500">{result.leftoverAdvice}</p>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => { setResult(null); setError(null) }}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
                >
                  Recalculate
                </button>
                <button
                  onClick={handleClose}
                  className="flex-1 py-2.5 rounded-xl bg-gray-900 hover:bg-black text-white text-sm font-medium transition"
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
