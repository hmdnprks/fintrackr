'use client'

import { useMemo, useState, useEffect } from 'react'
import { detectEWalletTopups, type EWalletSummary } from '@/lib/ewallets'
import { formatIDR } from '@/lib/formatter'
import { getVaultDataSync } from '@/lib/storage/secureStorage'

const COLOR_CLASSES: Record<string, { bar: string; bg: string; text: string; border: string }> = {
  green:  { bar: 'bg-green-500',  bg: 'bg-green-50  dark:bg-green-900/20',  text: 'text-green-700  dark:text-green-400',  border: 'border-green-200  dark:border-green-800' },
  purple: { bar: 'bg-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800' },
  orange: { bar: 'bg-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800' },
  blue:   { bar: 'bg-blue-500',   bg: 'bg-blue-50   dark:bg-blue-900/20',   text: 'text-blue-700   dark:text-blue-400',   border: 'border-blue-200   dark:border-blue-800'   },
  red:    { bar: 'bg-red-500',    bg: 'bg-red-50    dark:bg-red-900/20',    text: 'text-red-700    dark:text-red-400',    border: 'border-red-200    dark:border-red-800'    },
  teal:   { bar: 'bg-teal-500',   bg: 'bg-teal-50   dark:bg-teal-900/20',   text: 'text-teal-700   dark:text-teal-400',   border: 'border-teal-200   dark:border-teal-800'   },
}

function monthLabel(ym: string): string {
  const [y, m] = ym.split('-')
  return new Date(Number(y), Number(m) - 1, 1)
    .toLocaleDateString('en-US', { month: 'short' })
}

function MiniBarChart({ history, color }: { history: { monthKey: string; total: number }[]; color: string }) {
  const last6 = history.slice(-6)
  if (last6.length < 2) return null
  const max = Math.max(...last6.map(h => h.total), 1)
  const barColor = COLOR_CLASSES[color]?.bar ?? 'bg-gray-400'

  return (
    <div className="relative group/chart flex items-end gap-0.5 h-8 cursor-default">
      {last6.map(h => (
        <div key={h.monthKey} className="flex flex-col items-center gap-0.5 flex-1">
          <div
            className={`w-full rounded-sm ${barColor} opacity-80`}
            style={{ height: `${Math.max(2, (h.total / max) * 28)}px` }}
          />
        </div>
      ))}

      {/* Hover flyout — replaces unreliable native title tooltip */}
      <div className="pointer-events-none absolute bottom-full right-0 mb-2 z-20 hidden group-hover/chart:block">
        <div className="bg-gray-950 border border-gray-700 rounded-xl py-2 px-3 shadow-xl min-w-[148px] space-y-1">
          {last6.map(h => (
            <div key={h.monthKey} className="flex items-center justify-between gap-4 text-[11px]">
              <span className="text-gray-400">{monthLabel(h.monthKey)} {h.monthKey.slice(0, 4)}</span>
              <span className="text-gray-100 font-semibold tabular-nums">{formatIDR(h.total)}</span>
            </div>
          ))}
        </div>
        {/* Caret */}
        <div className="absolute -bottom-1.5 right-4 w-3 h-3 bg-gray-950 border-r border-b border-gray-700 rotate-45" />
      </div>
    </div>
  )
}

function DeltaBadge({ current, prior }: { current: number; prior: number }) {
  if (prior === 0) return (
    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
      new
    </span>
  )
  const pct = Math.round(((current - prior) / prior) * 100)
  if (Math.abs(pct) < 2) return null
  const up = pct > 0
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${
      up
        ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
        : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
    }`}>
      {up ? '▲' : '▼'}{Math.abs(pct)}%
    </span>
  )
}

function WalletRow({ summary, maxTotal, onGoToTransactions }: {
  summary: EWalletSummary
  maxTotal: number
  onGoToTransactions?: (keyword: string) => void
}) {
  const { wallet, currentMonthTotal, priorMonthTotal, monthlyHistory } = summary
  const colors = COLOR_CLASSES[wallet.color] ?? COLOR_CLASSES.blue
  const barPct = maxTotal > 0 ? (currentMonthTotal / maxTotal) * 100 : 0

  return (
    <div className={`rounded-xl border ${colors.border} ${colors.bg} px-4 py-3`}>
      <div className="flex items-center gap-3">
        {/* Wallet identity */}
        {wallet.logo ? (
          <img src={wallet.logo} alt={wallet.name} className="w-8 h-8 rounded-lg object-contain shrink-0" />
        ) : (
          <span className="text-xl leading-none shrink-0">{wallet.emoji}</span>
        )}

        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Name + amount + delta */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className={`text-sm font-semibold ${colors.text}`}>{wallet.name}</span>
              <DeltaBadge current={currentMonthTotal} prior={priorMonthTotal} />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                {formatIDR(currentMonthTotal)}
              </span>
              {onGoToTransactions && (
                <button
                  onClick={() => onGoToTransactions(summary.searchKeyword)}
                  title="Find in transactions"
                  className="p-1 text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400 rounded-lg transition"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 bg-white/60 dark:bg-gray-900/40 rounded-full overflow-hidden">
            <div
              className={`h-full ${colors.bar} rounded-full transition-all duration-500`}
              style={{ width: `${barPct}%` }}
            />
          </div>
        </div>

        {/* Mini trend chart */}
        {monthlyHistory.length >= 2 && (
          <div className="shrink-0 w-16 hidden sm:block">
            <p className="text-[9px] text-center text-gray-400 dark:text-gray-500 mb-0.5 leading-none">6-mo trend</p>
            <MiniBarChart history={monthlyHistory} color={wallet.color} />
          </div>
        )}
      </div>
    </div>
  )
}

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transactions: any[]
  selectedMonth?: string
  onGoToTransactions?: (keyword: string) => void
}

export default function EWalletSection({ transactions, selectedMonth, onGoToTransactions }: Props) {
  const transactionLabels = useMemo(
    () => (getVaultDataSync().transactionLabels ?? {}) as Record<string, string>,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  // Detect full history without a reference month so we can navigate
  const allSummaries: EWalletSummary[] = useMemo(
    () => detectEWalletTopups(transactions, undefined, transactionLabels),
    [transactions, transactionLabels]
  )

  // Sorted union of all months that appear in any wallet's history
  const availableMonths = useMemo(() => {
    const set = new Set<string>()
    for (const s of allSummaries) {
      for (const h of s.monthlyHistory) set.add(h.monthKey)
    }
    return Array.from(set).sort()
  }, [allSummaries])

  // Default: prop month if given, otherwise latest available
  const defaultMonth = useMemo(() => {
    if (selectedMonth && selectedMonth !== 'all') return selectedMonth
    return availableMonths[availableMonths.length - 1] ?? ''
  }, [selectedMonth, availableMonths])

  const [viewMonth, setViewMonth] = useState(defaultMonth)

  // Sync when the dashboard global filter changes
  useEffect(() => {
    setViewMonth(defaultMonth)
  }, [defaultMonth])

  const viewIndex = availableMonths.indexOf(viewMonth)
  const canPrev = viewIndex > 0
  const canNext = viewIndex < availableMonths.length - 1

  // Re-run detection for the selected view month so delta badge is correct
  const summaries: EWalletSummary[] = useMemo(
    () => detectEWalletTopups(transactions, viewMonth || undefined, transactionLabels),
    [transactions, viewMonth, transactionLabels]
  )

  const totalCurrentMonth = summaries.reduce((s, e) => s + e.currentMonthTotal, 0)
  const maxTotal = Math.max(...summaries.map(s => s.currentMonthTotal), 1)

  const currentLabel = useMemo(() => {
    if (!viewMonth) return 'this month'
    const [y, m] = viewMonth.split('-').map(Number)
    return new Date(y, m - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }, [viewMonth])

  if (allSummaries.length === 0) return null

  return (
    <div className="bg-white dark:bg-gray-900 dark:border dark:border-gray-800 rounded-2xl shadow-sm p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Digital Wallets</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            Detected from bank transfers & direct charges
          </p>
        </div>

        {/* Month navigator */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => canPrev && setViewMonth(availableMonths[viewIndex - 1])}
            disabled={!canPrev}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-25 disabled:cursor-not-allowed transition"
            aria-label="Previous month"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[110px] text-center">
            {currentLabel}
          </span>
          <button
            onClick={() => canNext && setViewMonth(availableMonths[viewIndex + 1])}
            disabled={!canNext}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-25 disabled:cursor-not-allowed transition"
            aria-label="Next month"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
      </div>

      {/* Total for selected month */}
      {totalCurrentMonth > 0 && (
        <div className="mb-4">
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatIDR(totalCurrentMonth)}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">total this month</p>
        </div>
      )}

      {summaries.length > 0 ? (
        <div className="space-y-2">
          {summaries.map(s => (
            <WalletRow
              key={s.wallet.name}
              summary={s}
              maxTotal={maxTotal}
              onGoToTransactions={onGoToTransactions
                ? (keyword) => onGoToTransactions(viewMonth ? `${keyword}:${viewMonth}` : keyword)
                : undefined}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">
          No wallet activity in {currentLabel}.
        </p>
      )}

      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-4 leading-relaxed">
        Shows money transferred to or charged via each wallet from your bank statements.
        Purchases made inside the wallet (GoFood, Grab, etc.) are not visible unless they appear in your bank statement directly.
      </p>
    </div>
  )
}
