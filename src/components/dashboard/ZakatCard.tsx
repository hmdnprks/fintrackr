'use client'

import { useMemo } from 'react'
import { formatIDR } from '@/lib/formatter'
import { calcZakat, NISAB_MONTHLY, NISAB_ANNUAL, ZAKAT_RATE, NISAB_YEAR } from '@/lib/zakat'

type SavingsRateTrendItem = { label: string; income: number; expense: number; rate: number }

interface Props {
  savingsRateTrend: SavingsRateTrendItem[]
}

const BAZNAS_PAY_URL = 'https://baznas.go.id/bayarzakat'

export default function ZakatCard({ savingsRateTrend }: Props) {
  const avgMonthlyIncome = useMemo(() => {
    const incomeMonths = savingsRateTrend.filter(d => d.income > 0)
    if (!incomeMonths.length) return 0
    const last12 = incomeMonths.slice(-12)
    return Math.round(last12.reduce((s, d) => s + d.income, 0) / last12.length)
  }, [savingsRateTrend])

  const result = calcZakat(avgMonthlyIncome)
  const hasData = avgMonthlyIncome > 0

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">

      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
            {/* Crescent moon icon */}
            <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Zakat Penghasilan</h2>
              <span className="text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded-full">
                {NISAB_YEAR}
              </span>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              Income Zakat · {(ZAKAT_RATE * 100).toFixed(1)}% of income above nisab
            </p>
          </div>
        </div>
        {result.status === 'above_nisab' && (
          <span className="shrink-0 text-xs font-semibold bg-emerald-500 text-white px-2.5 py-1 rounded-full">
            Wajib Zakat
          </span>
        )}
        {result.status === 'below_nisab' && hasData && (
          <span className="shrink-0 text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2.5 py-1 rounded-full">
            Belum Wajib
          </span>
        )}
      </div>

      <div className="px-6 py-5 space-y-4">

        {!hasData ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
            Import statements to calculate your Zakat obligation.
          </p>
        ) : (
          <>
            {/* Nisab vs income comparison */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3">
                <p className="text-xs text-gray-400 dark:text-gray-500">Avg monthly income</p>
                <p className="text-base font-bold text-gray-900 dark:text-gray-100 mt-0.5">
                  {formatIDR(avgMonthlyIncome)}
                </p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                  last {Math.min(savingsRateTrend.filter(d => d.income > 0).length, 12)} months avg
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3">
                <p className="text-xs text-gray-400 dark:text-gray-500">Nisab threshold</p>
                <p className="text-base font-bold text-gray-900 dark:text-gray-100 mt-0.5">
                  {formatIDR(NISAB_MONTHLY)}
                </p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                  per month · {formatIDR(NISAB_ANNUAL)}/yr
                </p>
              </div>
            </div>

            {/* Progress bar — income vs nisab */}
            <div>
              <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-500 mb-1">
                <span>0</span>
                <span>Nisab: {formatIDR(NISAB_MONTHLY)}</span>
              </div>
              <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    result.status === 'above_nisab'
                      ? 'bg-emerald-500'
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                  style={{ width: `${Math.min((avgMonthlyIncome / NISAB_MONTHLY) * 100, 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                {result.status === 'above_nisab'
                  ? `Income is ${((avgMonthlyIncome / NISAB_MONTHLY - 1) * 100).toFixed(0)}% above nisab`
                  : `Income is ${((1 - avgMonthlyIncome / NISAB_MONTHLY) * 100).toFixed(0)}% below nisab`}
              </p>
            </div>

            {/* Zakat amount — only if wajib */}
            {result.status === 'above_nisab' && (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50 rounded-xl px-4 py-4 space-y-3">
                <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wide">
                  Zakat obligation
                </p>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                      {formatIDR(result.monthlyZakat)}
                    </p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-0.5">per month</p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-semibold text-emerald-700 dark:text-emerald-400">
                      {formatIDR(result.annualZakat)}
                    </p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-0.5">per year</p>
                  </div>
                </div>
                <a
                  href={BAZNAS_PAY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold py-2.5 rounded-xl transition"
                >
                  Pay via BAZNAS
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                </a>
              </div>
            )}

            {/* Below nisab message */}
            {result.status === 'below_nisab' && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 flex items-start gap-2">
                <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                </svg>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  Your average monthly income ({formatIDR(avgMonthlyIncome)}) is below the nisab threshold ({formatIDR(NISAB_MONTHLY)}/month).
                  Income Zakat is not obligatory at this level — but consider voluntary Infaq or Sedekah.
                </p>
              </div>
            )}
          </>
        )}

        {/* Footer disclaimer */}
        <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-relaxed border-t border-gray-100 dark:border-gray-800 pt-3">
          Estimate based on BAZNAS {NISAB_YEAR} nisab (85g gold × Rp 1,500,000/g). Actual obligation may vary.
          Consult your local amil or visit{' '}
          <a href="https://baznas.go.id" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600 dark:hover:text-gray-300">
            baznas.go.id
          </a>{' '}
          for precise figures.
        </p>
      </div>
    </div>
  )
}
