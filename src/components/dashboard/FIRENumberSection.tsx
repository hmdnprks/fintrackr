'use client'

import { useState } from 'react'
import { getAssets, Asset } from '@/lib/assetStorage'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'

interface Props {
  savingsRateTrend: { income: number; expense: number; rate: number }[]
}

function formatIDRBig(n: number): string {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1).replace('.', ',')} miliar`
  if (n >= 1_000_000)     return `Rp ${(n / 1_000_000).toFixed(0)} jt`
  if (n >= 1_000)         return `Rp ${Math.round(n / 1_000)}rb`
  return `Rp ${Math.round(n).toLocaleString('id-ID')}`
}

function formatYears(y: number): string {
  if (!isFinite(y) || y <= 0) return '—'
  if (y < 1)  return `~${Math.round(y * 12)} months`
  if (y < 2)  return `~1 year`
  return `~${Math.round(y)} years`
}

export default function FIRENumberSection({ savingsRateTrend }: Props) {
  const [assets]    = useState<Asset[]>(() => getAssets())
  const [showInfo, setShowInfo] = useState(false)

  if (!savingsRateTrend.length && !assets.length) return null

  const avgMonthlyExpense = savingsRateTrend.length
    ? savingsRateTrend.reduce((s, d) => s + d.expense, 0) / savingsRateTrend.length
    : 0

  const avgMonthlySavings = savingsRateTrend.length
    ? savingsRateTrend.reduce((s, d) => s + (d.income - d.expense), 0) / savingsRateTrend.length
    : 0

  const annualExpense  = avgMonthlyExpense  * 12
  const annualSavings  = avgMonthlySavings  * 12
  const fireTarget     = annualExpense * 25
  const netWorth       = assets.reduce((s, a) => s + a.currentValue, 0)
  const gap            = Math.max(0, fireTarget - netWorth)
  const progressPct    = fireTarget > 0 ? Math.min(100, (netWorth / fireTarget) * 100) : 0
  const yearsToFire    = annualSavings > 0 && gap > 0 ? gap / annualSavings : 0
  const alreadyFIRE    = netWorth >= fireTarget && fireTarget > 0

  const progressColor =
    progressPct >= 100 ? 'bg-emerald-500' :
    progressPct >= 50  ? 'bg-blue-500'    :
    progressPct >= 20  ? 'bg-amber-400'   :
    'bg-gray-400'

  const hasEnoughData = avgMonthlyExpense > 0

  return (
    <div className="bg-white dark:bg-gray-900 dark:border dark:border-gray-800 p-6 rounded-2xl shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">FIRE Number</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            Financial independence target — 25× your annual expenses (4% rule)
          </p>
        </div>
        {hasEnoughData && (
          <div className="text-right shrink-0 ml-4">
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{formatIDRBig(fireTarget)}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">target</p>
          </div>
        )}
      </div>

      {!hasEnoughData ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">
          Import statements to compute your FIRE target.
        </p>
      ) : (
        <>
          {/* Progress */}
          <div className="mb-5">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-gray-500 dark:text-gray-400">
                Net worth: <span className="font-semibold text-gray-700 dark:text-gray-300">{formatIDRBig(netWorth)}</span>
              </span>
              <span className={`font-bold ${alreadyFIRE ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-600 dark:text-gray-400'}`}>
                {alreadyFIRE ? '🎉 Reached!' : `${progressPct.toFixed(1)}%`}
              </span>
            </div>
            <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${progressColor}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-300 dark:text-gray-600 mt-1">
              <span>{formatIDRBig(netWorth)}</span>
              <span>{formatIDRBig(fireTarget)}</span>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-3 bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-center mb-4">
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Annual expenses</p>
              <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{formatIDRBig(annualExpense)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Annual savings</p>
              <p className={`text-sm font-bold ${avgMonthlySavings > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                {avgMonthlySavings > 0 ? formatIDRBig(annualSavings) : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Years to FIRE</p>
              <p className={`text-sm font-bold ${alreadyFIRE ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-800 dark:text-gray-200'}`}>
                {alreadyFIRE ? 'Now!' : yearsToFire > 0 ? formatYears(yearsToFire) : '—'}
              </p>
            </div>
          </div>

              {/* Contextual note */}
          <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed mb-4">
            {alreadyFIRE
              ? "Your net worth covers 25× your annual expenses. You've technically reached financial independence."
              : avgMonthlySavings <= 0
              ? "Your expenses currently exceed income in this period. Increase your savings rate to make FIRE progress."
              : `At your current savings rate, you'd reach your FIRE target in ${formatYears(yearsToFire)}. Investment returns (est. 7–10% p.a.) would accelerate this significantly.`}
          </p>

          {/* What is FIRE — collapsible */}
          <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowInfo(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              <span>What is FIRE?</span>
              {showInfo
                ? <ChevronUpIcon className="w-3.5 h-3.5" />
                : <ChevronDownIcon className="w-3.5 h-3.5" />}
            </button>

            {showInfo && (
              <div className="px-4 pb-4 space-y-3 text-xs text-gray-500 dark:text-gray-400 leading-relaxed border-t border-gray-100 dark:border-gray-800 pt-3">
                <p>
                  <strong className="text-gray-700 dark:text-gray-300">FIRE</strong> stands for{' '}
                  <strong className="text-gray-700 dark:text-gray-300">Financial Independence, Retire Early</strong> — a
                  framework for building enough wealth that your investments can cover your living expenses forever,
                  so paid work becomes optional.
                </p>
                <p>
                  <strong className="text-gray-700 dark:text-gray-300">The 4% rule</strong> is the foundation: research
                  (the Trinity Study) shows that withdrawing 4% of a diversified portfolio per year has historically
                  lasted 30+ years without running out. The FIRE number (25×) is simply the inverse — if you spend
                  Rp 10 jt/month (Rp 120 jt/year), you need Rp 3 miliar invested to safely withdraw that amount annually.
                </p>
                <p>
                  <strong className="text-gray-700 dark:text-gray-300">In an Indonesian context</strong>, typical
                  investment returns from Reksa Dana Saham (10–15% p.a.) or a mix with Obligasi (7–9%) would
                  outpace the 4% withdrawal rate, making the timeline shorter than this estimate suggests.
                  This calculator uses only your current savings rate with no investment return assumption — the
                  conservative base case.
                </p>
                <p>
                  <strong className="text-gray-700 dark:text-gray-300">FIRE variants</strong> — Lean FIRE targets a
                  minimal lifestyle; Fat FIRE targets a comfortable one; Barista FIRE means reaching partial
                  independence with a small side income. Your FIRE number adjusts automatically as your spending changes.
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
