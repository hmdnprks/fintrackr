/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useMemo } from 'react'
import { Asset, AssetType, getAssets, deleteAsset, getNetWorthSnapshots, getAssetSnapshots, NetWorthSnapshot, AssetSnapshot } from '@/lib/assetStorage'
import { getLiabilities, deleteLiability, type Liability, type LiabilityType } from '@/lib/liabilityStorage'
import AssetModal from './AssetModal'
import WindfallModal from './WindfallModal'
import RebalanceModal from './RebalanceModal'
import LiabilityModal from './LiabilityModal'

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  statements: any[]   // used to compute avg monthly expense for emergency fund months
}

function formatIDR(n: number) {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}M`
  if (n >= 1_000_000)     return `Rp ${(n / 1_000_000).toFixed(1)} jt`
  if (n >= 1_000)         return `Rp ${Math.round(n / 1_000)}rb`
  return `Rp ${Math.round(n).toLocaleString('id-ID')}`
}

function formatIDRFull(n: number) {
  return `Rp ${Math.round(n).toLocaleString('id-ID')}`
}

import {
  BanknotesIcon, StarIcon, ArrowTrendingUpIcon, WalletIcon, ArchiveBoxIcon,
  ExclamationCircleIcon, ExclamationTriangleIcon, CheckCircleIcon, ShieldCheckIcon,
  CheckIcon, LockClosedIcon, BriefcaseIcon, TruckIcon, HomeModernIcon,
} from '@heroicons/react/24/outline'
import InfoTooltip from '@/components/ui/InfoTooltip'
import { getVaultDataSync, saveVaultData } from '@/lib/storage/secureStorage'

type IconComponent = React.ComponentType<{ className?: string }>

const TYPE_META: Record<AssetType, { label: string; color: string; bg: string; Icon: IconComponent }> = {
  savings:    { label: 'Savings',    color: 'text-blue-700 dark:text-blue-400',     bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800/50',       Icon: BanknotesIcon      },
  gold:       { label: 'Gold',       color: 'text-yellow-700 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-100 dark:border-yellow-800/50', Icon: StarIcon            },
  investment: { label: 'Investment', color: 'text-green-700 dark:text-green-400',   bg: 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800/50',     Icon: ArrowTrendingUpIcon },
  pocket:     { label: 'Pocket',     color: 'text-purple-700 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800/50', Icon: WalletIcon          },
  vehicle:    { label: 'Vehicle',    color: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800/50', Icon: TruckIcon           },
  property:   { label: 'Property',   color: 'text-teal-700 dark:text-teal-400',     bg: 'bg-teal-50 dark:bg-teal-900/20 border-teal-100 dark:border-teal-800/50',         Icon: HomeModernIcon      },
  other:      { label: 'Other',      color: 'text-gray-600 dark:text-gray-400',     bg: 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700',               Icon: ArchiveBoxIcon      },
}

const TYPE_ORDER: AssetType[] = ['savings', 'gold', 'investment', 'pocket', 'vehicle', 'property', 'other']

const STALE_DAYS = 30

function computeEstimatedValue(purchasePrice: number, purchaseYear: number, annualRate: number): number {
  const years = new Date().getFullYear() - purchaseYear
  if (years <= 0) return purchasePrice
  return Math.max(0, purchasePrice * Math.pow(1 + annualRate / 100, years))
}

const SUBTYPE_LABELS: Record<string, string> = {
  car: 'Car', motorcycle: 'Motorcycle', house: 'House',
  apartment: 'Apartment', land: 'Land', other: 'Other',
}

function isStale(iso: string): boolean {
  return (Date.now() - new Date(iso).getTime()) > STALE_DAYS * 24 * 60 * 60 * 1000
}

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000))
}

function relativeDate(iso: string) {
  const d = new Date(iso)
  const dateStr = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  const timeStr = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  return `Updated: ${dateStr} ${timeStr}`
}

export type HouseholdType = 'single' | 'couple' | 'family' | 'family+'

export default function AssetsTab({ statements }: Props) {
  const [assets, setAssets] = useState<Asset[]>(() => getAssets())
  const [liabilities, setLiabilities] = useState<Liability[]>(() => getLiabilities())
  const [snapshots, setSnapshots]         = useState<NetWorthSnapshot[]>(() => getNetWorthSnapshots())
  const [assetSnapshots, setAssetSnapshots] = useState<AssetSnapshot[]>(() => getAssetSnapshots())
  const [showModal, setShowModal]         = useState(false)
  const [showWindfall, setShowWindfall]   = useState(false)
  const [showRebalance, setShowRebalance] = useState(false)
  const [showLiabilityModal, setShowLiabilityModal] = useState(false)
  const [editingAsset, setEditingAsset]   = useState<Asset | null>(null)
  const [editingLiability, setEditingLiability] = useState<Liability | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [confirmDeleteLiability, setConfirmDeleteLiability] = useState<string | null>(null)
  const [householdType, setHouseholdType] = useState<HouseholdType>(
    () => (getVaultDataSync().settings?.householdType as HouseholdType) ?? 'single'
  )
  const [staleBannerDismissed, setStaleBannerDismissed] = useState(false)

  const staleAssets = useMemo(() => assets.filter(a => isStale(a.updatedAt)), [assets])
  const hasStale = staleAssets.length > 0

  async function handleHouseholdChange(v: HouseholdType) {
    setHouseholdType(v)
    const vault = getVaultDataSync()
    await saveVaultData({ settings: { ...(vault.settings ?? {}), householdType: v } })
  }

  function reload() {
    setAssets(getAssets())
    setLiabilities(getLiabilities())
    setSnapshots(getNetWorthSnapshots())
    setAssetSnapshots(getAssetSnapshots())
  }

  async function handleDeleteLiability(id: string) {
    await deleteLiability(id)
    setLiabilities(getLiabilities())
    setConfirmDeleteLiability(null)
  }

  // Average real monthly expense from the 6 most recent months.
  // Excludes Transfer, Bank Charges, and Loan — financial movements / debt obligations.
  const EXPENSE_EXCLUDE = new Set(['Transfer', 'Bank Charges', 'Loan'])

  const { avgMonthlyExpense, expenseBreakdown } = useMemo(() => {
    if (!statements.length) return { avgMonthlyExpense: 0, expenseBreakdown: [] }

    // Build per-category, per-month totals + top transactions per category
    const catByMonth: Record<string, Record<string, number>> = {}
    const monthTotals: Record<string, number> = {}
    const catTxns: Record<string, { detail: string; amount: number; monthKey: string }[]> = {}

    for (const s of statements as any[]) {
      if (!s.monthKey) continue
      for (const tx of s.transactions || []) {
        if (tx.type !== 'debit') continue
        const cat = tx.category || 'Uncategorized'
        if (EXPENSE_EXCLUDE.has(cat)) continue
        if (cat === 'Income') continue
        const amt = tx.amount || 0
        if (!catByMonth[cat]) catByMonth[cat] = {}
        catByMonth[cat][s.monthKey] = (catByMonth[cat][s.monthKey] || 0) + amt
        monthTotals[s.monthKey] = (monthTotals[s.monthKey] || 0) + amt
        if (!catTxns[cat]) catTxns[cat] = []
        catTxns[cat].push({ detail: tx.detail, amount: amt, monthKey: s.monthKey })
      }
    }

    // 6 most recent months that have any spending
    const sampleMonths = Object.entries(monthTotals)
      .filter(([, v]) => v > 0)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 6)
      .map(([k]) => k)

    const n = sampleMonths.length
    if (!n) return { avgMonthlyExpense: 0, expenseBreakdown: [] }

    // For each category: if it appeared in fewer than half the sample months,
    // it's an infrequent/annual expense — amortise over 12 months so a once-a-year
    // rent payment doesn't inflate the monthly average.
    const expenseBreakdown: { category: string; avg: number; amortised: boolean; topTxns: { detail: string; amount: number; monthKey: string }[] }[] = []
    let totalAvg = 0

    for (const [cat, monthAmounts] of Object.entries(catByMonth)) {
      const monthsActive = sampleMonths.filter(m => (monthAmounts[m] || 0) > 0).length
      const total = sampleMonths.reduce((s, m) => s + (monthAmounts[m] || 0), 0)
      const amortised = monthsActive < Math.ceil(n / 2)
      const avg = total / (amortised ? 12 : n)
      // Top 5 transactions for this category in the sample period, by amount desc
      const topTxns = (catTxns[cat] ?? [])
        .filter(tx => sampleMonths.includes(tx.monthKey))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5)
      expenseBreakdown.push({ category: cat, avg, amortised, topTxns })
      totalAvg += avg
    }

    expenseBreakdown.sort((a, b) => b.avg - a.avg)

    return { avgMonthlyExpense: totalAvg, expenseBreakdown }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statements])

  const totalByType = useMemo(() => {
    const map: Record<string, number> = {}
    for (const a of assets) {
      map[a.type] = (map[a.type] || 0) + a.currentValue
    }
    return map
  }, [assets])

  const totalAssets = Object.values(totalByType).reduce((s, v) => s + v, 0)
  const totalLiabilities = liabilities.reduce((s, l) => s + l.remainingBalance, 0)
  const totalNetWorth = totalAssets - totalLiabilities

  const lastUpdatedLabel = useMemo(() => {
    if (!assets.length) return null
    const latest = assets.reduce((a, b) => new Date(a.updatedAt) > new Date(b.updatedAt) ? a : b)
    return { label: relativeDate(latest.updatedAt) }
  }, [assets])

  // Net worth growth — compare current total to the most recent snapshot
  // that is at least 25 days old (approximates "previous month")
  const netWorthGrowth = useMemo(() => {
    if (snapshots.length < 2 || totalNetWorth === 0) return null
    const today = new Date()
    const cutoff = new Date(today)
    cutoff.setDate(cutoff.getDate() - 25)
    const cutoffStr = cutoff.toISOString().split('T')[0]
    const older = snapshots.filter(s => s.date <= cutoffStr)
    if (!older.length) return null
    const prev = older[older.length - 1]
    const change = totalNetWorth - prev.value
    const pct = prev.value > 0 ? (change / prev.value) * 100 : 0
    return { change, pct, since: prev.date }
  }, [snapshots, totalNetWorth])

  // Liquid coverage ratio — ALL savings accounts ÷ avg monthly expense
  // Broader than emergency fund (includes Mandiri payroll, all savings)
  const liquidCoverageMonths = useMemo(() => {
    if (avgMonthlyExpense <= 0) return null
    const totalLiquid = assets
      .filter(a => a.type === 'savings')
      .reduce((s, a) => s + a.currentValue, 0)
    return { months: totalLiquid / avgMonthlyExpense, totalLiquid }
  }, [assets, avgMonthlyExpense])

  const emergencyFundTotal = assets
    .filter(a => a.type === 'savings' && a.isEmergencyFund)
    .reduce((s, a) => s + a.currentValue, 0)

  const emergencyMonths = avgMonthlyExpense > 0
    ? emergencyFundTotal / avgMonthlyExpense
    : null

  const groupedAssets = useMemo(() => {
    const map: Record<string, Asset[]> = {}
    for (const a of assets) {
      if (!map[a.type]) map[a.type] = []
      map[a.type].push(a)
    }
    return map
  }, [assets])

  async function handleDelete(id: string) {
    await deleteAsset(id)
    setConfirmDelete(null)
    reload()
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Assets</h2>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Track your savings, gold, investments, and goal pockets</p>
        </div>
        <div className="flex items-center gap-2">
          {assets.length > 0 && (
            <button
              onClick={() => setShowWindfall(true)}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              <span className="hidden sm:inline">Allocate Windfall</span>
              <span className="sm:hidden">Windfall</span>
            </button>
          )}
          <button
            onClick={() => { setEditingAsset(null); setShowModal(true) }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span className="hidden sm:inline">Add Asset</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      {/* Stale assets banner */}
      {hasStale && !staleBannerDismissed && (
        <div className="flex items-start justify-between gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-2xl px-4 py-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <svg className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <div className="min-w-0">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                {staleAssets.length === 1
                  ? `1 asset hasn't been updated in ${STALE_DAYS}+ days`
                  : `${staleAssets.length} assets haven't been updated in ${STALE_DAYS}+ days`}
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5 truncate">
                {staleAssets.map(a => a.name).join(', ')} — tap the edit icon to refresh values
              </p>
            </div>
          </div>
          <button
            onClick={() => setStaleBannerDismissed(true)}
            className="shrink-0 text-amber-400 hover:text-amber-600 dark:text-amber-500 dark:hover:text-amber-300 transition"
            aria-label="Dismiss"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Net worth summary */}
      {assets.length > 0 && (
        <div className="bg-white dark:bg-gray-900 dark:border dark:border-gray-800 rounded-2xl shadow-sm p-6">
          <div className="mb-4">
            <div className="flex items-start justify-between gap-3 mb-1">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Net Worth</p>
              <button
                onClick={() => setShowRebalance(true)}
                className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 px-2.5 py-1 rounded-lg transition shrink-0"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                Rebalance with AI
              </button>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 break-all">{formatIDRFull(totalNetWorth)}</p>
            {/* Last updated */}
            {lastUpdatedLabel && (
              <p className={`text-xs mt-0.5 flex items-center gap-1 ${hasStale ? 'text-amber-500 dark:text-amber-400' : 'text-gray-400 dark:text-gray-500'}`}>
                {hasStale && (
                  <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                )}
                {lastUpdatedLabel.label}{hasStale ? ' — some values may be outdated' : ''}
              </p>
            )}
            {netWorthGrowth !== null && (
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <span className={`inline-flex items-center gap-1 text-sm font-semibold ${netWorthGrowth.change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                  {netWorthGrowth.change >= 0 ? '↑' : '↓'}
                  {formatIDR(Math.abs(netWorthGrowth.change))}
                  <span className="font-normal text-xs">({Math.abs(netWorthGrowth.pct).toFixed(1)}%)</span>
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  since {new Date(netWorthGrowth.since).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            )}
            {snapshots.length === 0 && assets.length > 0 && (
              <p className="text-xs text-gray-400 mt-1">Update asset values regularly to track growth over time.</p>
            )}
          </div>

          {/* Assets / Liabilities summary row */}
          {totalLiabilities > 0 && (
            <div className="flex items-center justify-between text-sm mb-4 bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3">
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500">Total Assets</p>
                <p className="font-semibold text-gray-800 dark:text-gray-200">{formatIDRFull(totalAssets)}</p>
              </div>
              <div className="text-gray-300 dark:text-gray-600 text-lg">−</div>
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500">Total Liabilities</p>
                <p className="font-semibold text-red-500 dark:text-red-400">{formatIDRFull(totalLiabilities)}</p>
              </div>
              <div className="text-gray-300 dark:text-gray-600 text-lg">=</div>
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500">Net Worth</p>
                <p className={`font-semibold ${totalNetWorth >= 0 ? 'text-gray-800 dark:text-gray-200' : 'text-red-500'}`}>{formatIDRFull(totalNetWorth)}</p>
              </div>
            </div>
          )}

          {/* Breakdown bars */}
          <div className="space-y-2.5">
            {TYPE_ORDER.filter(t => totalByType[t] > 0).map(t => {
              const meta = TYPE_META[t]
              const pct = totalAssets > 0 ? (totalByType[t] / totalAssets) * 100 : 0
              return (
                <div key={t}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400"><meta.Icon className="w-3 h-3" />{meta.label}</span>
                    <span className="text-gray-400 dark:text-gray-500">{formatIDR(totalByType[t])} · {Math.round(pct)}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        t === 'savings'    ? 'bg-blue-400'   :
                        t === 'gold'       ? 'bg-yellow-400' :
                        t === 'investment' ? 'bg-green-400'  :
                        t === 'pocket'     ? 'bg-purple-400' :
                        t === 'vehicle'    ? 'bg-orange-400' :
                        t === 'property'   ? 'bg-teal-400'   :
                        'bg-gray-400'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          <NetWorthTrendChart snapshots={snapshots} />
        </div>
      )}

      {/* Liquidity metrics — emergency fund + liquid coverage side by side on desktop */}
      {(emergencyMonths !== null || liquidCoverageMonths !== null) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {emergencyMonths !== null && (
            <EmergencyFundSection
              months={emergencyMonths}
              avgMonthlyExpense={avgMonthlyExpense}
              expenseBreakdown={expenseBreakdown}
              householdType={householdType}
              onHouseholdChange={handleHouseholdChange}
            />
          )}
          {liquidCoverageMonths !== null && (
            <LiquidCoverageSection
              months={liquidCoverageMonths.months}
              totalLiquid={liquidCoverageMonths.totalLiquid}
            />
          )}
        </div>
      )}

      {/* Asset cards grouped by type */}
      {assets.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 dark:border dark:border-gray-800 rounded-2xl shadow-sm p-8 sm:p-12 text-center">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 mx-auto mb-3">
            <BriefcaseIcon className="w-7 h-7 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300">No assets yet</h3>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 max-w-xs mx-auto">
            Add your savings accounts, gold, investments, and Jago pockets to see your full financial picture.
          </p>
          <button
            onClick={() => { setEditingAsset(null); setShowModal(true) }}
            className="mt-5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition"
          >
            Add your first asset
          </button>
        </div>
      ) : (
        TYPE_ORDER.filter(t => groupedAssets[t]?.length).map(t => {
          const meta = TYPE_META[t]
          return (
            <div key={t}>
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                <meta.Icon className="w-3.5 h-3.5" />{meta.label}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {groupedAssets[t].map(asset => (
                  <AssetCard
                    key={asset.id}
                    asset={asset}
                    meta={meta}
                    avgMonthlyExpense={avgMonthlyExpense}
                    snapshots={assetSnapshots.filter(s => s.assetId === asset.id)}
                    onEdit={() => { setEditingAsset(asset); setShowModal(true) }}
                    onDelete={() => setConfirmDelete(asset.id)}
                  />
                ))}
              </div>
            </div>
          )
        })
      )}

      {/* Liabilities section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75" />
            </svg>
            Liabilities
          </h3>
          <button
            onClick={() => { setEditingLiability(null); setShowLiabilityModal(true) }}
            className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:text-red-400 px-2.5 py-1.5 rounded-lg transition"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Liability
          </button>
        </div>

        {liabilities.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 dark:border dark:border-gray-800 rounded-2xl shadow-sm px-6 py-8 text-center">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No liabilities tracked</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Add KPR, KKB, KTA, or credit card debt to see your true net worth.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {liabilities.map(l => (
              <LiabilityCard
                key={l.id}
                liability={l}
                linkedAsset={assets.find(a => a.id === l.linkedAssetId)}
                onEdit={() => { setEditingLiability(l); setShowLiabilityModal(true) }}
                onDelete={() => setConfirmDeleteLiability(l.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete liability confirm */}
      {confirmDeleteLiability && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmDeleteLiability(null)} />
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 w-full max-w-sm z-10">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">Delete liability?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteLiability(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteLiability(confirmDeleteLiability)}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 w-full max-w-sm z-10">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">Delete asset?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <AssetModal
        isOpen={showModal}
        asset={editingAsset}
        onClose={() => setShowModal(false)}
        onSaved={reload}
      />

      <WindfallModal
        isOpen={showWindfall}
        onClose={() => setShowWindfall(false)}
        statements={statements}
        assets={assets}
        avgMonthlyExpense={avgMonthlyExpense}
        emergencyMonths={emergencyMonths}
        emergencyFundTotal={emergencyFundTotal}
      />

      <RebalanceModal
        isOpen={showRebalance}
        onClose={() => setShowRebalance(false)}
        statements={statements}
        assets={assets}
        avgMonthlyExpense={avgMonthlyExpense}
        emergencyMonths={emergencyMonths}
        emergencyFundTotal={emergencyFundTotal}
      />

      <LiabilityModal
        isOpen={showLiabilityModal}
        liability={editingLiability}
        onClose={() => setShowLiabilityModal(false)}
        onSaved={() => setLiabilities(getLiabilities())}
      />
    </div>
  )
}

// ── Liability Card ────────────────────────────────────────────────────────────

const LIABILITY_TYPE_META: Record<LiabilityType, { label: string; color: string; bg: string }> = {
  mortgage:      { label: 'KPR',          color: 'text-teal-700 dark:text-teal-400',   bg: 'bg-teal-50 dark:bg-teal-900/20'   },
  vehicle_loan:  { label: 'KKB',          color: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20' },
  personal_loan: { label: 'KTA',          color: 'text-purple-700 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20' },
  credit_card:   { label: 'Credit Card',  color: 'text-red-700 dark:text-red-400',     bg: 'bg-red-50 dark:bg-red-900/20'     },
  other:         { label: 'Debt',         color: 'text-gray-700 dark:text-gray-400',   bg: 'bg-gray-50 dark:bg-gray-900/20'   },
}

function LiabilityCard({ liability: l, linkedAsset, onEdit, onDelete }: {
  liability: Liability
  linkedAsset?: Asset
  onEdit: () => void
  onDelete: () => void
}) {
  const meta = LIABILITY_TYPE_META[l.type]
  const paidOff = l.originalAmount > 0
    ? Math.min(100, ((l.originalAmount - l.remainingBalance) / l.originalAmount) * 100)
    : 0

  const now = new Date()
  let monthsLeft: number | null = null
  if (l.endDate) {
    const [y, m] = l.endDate.split('-').map(Number)
    monthsLeft = (y - now.getFullYear()) * 12 + (m - (now.getMonth() + 1))
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full ${meta.bg} ${meta.color}`}>
                {meta.label}
              </span>
              {linkedAsset && (
                <span className="text-xs text-gray-400 dark:text-gray-500 truncate">🔗 {linkedAsset.name}</span>
              )}
            </div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{l.name}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{l.institution}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={onEdit} className="text-gray-300 hover:text-blue-400 transition p-0.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
              </svg>
            </button>
            <button onClick={onDelete} className="text-gray-300 hover:text-red-400 transition p-0.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="mt-3">
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Remaining balance</p>
          <p className="text-lg font-bold text-red-500 dark:text-red-400">−{formatIDRFull(l.remainingBalance)}</p>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>{paidOff.toFixed(1)}% paid off</span>
            <span>of {formatIDR(l.originalAmount)}</span>
          </div>
          <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-green-400 rounded-full" style={{ width: `${paidOff}%` }} />
          </div>
        </div>
      </div>

      {/* Footer details */}
      <div className="px-4 pb-3 flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500 flex-wrap">
        {l.monthlyInstallment && (
          <span>{formatIDR(l.monthlyInstallment)}/mo</span>
        )}
        {l.interestRate != null && (
          <span>{l.interestRate}% p.a.</span>
        )}
        {monthsLeft !== null && monthsLeft >= 0 && (
          <span>{monthsLeft} mo left</span>
        )}
        {monthsLeft !== null && monthsLeft < 0 && (
          <span className="text-red-400 dark:text-red-400">Matured</span>
        )}
        {l.endDate && !monthsLeft && monthsLeft !== 0 && (
          <span>ends {l.endDate}</span>
        )}
      </div>
    </div>
  )
}

// ── Emergency Fund Section ────────────────────────────────────────────────────

type EFStatus = 'critical' | 'low' | 'building' | 'healthy' | 'strong'

const EF_STATUS: Record<EFStatus, {
  label: string; color: string; bg: string; border: string; bar: string; Icon: IconComponent
}> = {
  critical: { label: 'Critical', Icon: ExclamationCircleIcon,   color: 'text-red-700 dark:text-red-400',       bg: 'bg-red-50 dark:bg-red-900/20',       border: 'border-red-200 dark:border-red-800/50',       bar: 'bg-red-500'    },
  low:      { label: 'Low',      Icon: ExclamationTriangleIcon,  color: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800/50', bar: 'bg-orange-400' },
  building: { label: 'Building', Icon: ArrowTrendingUpIcon,      color: 'text-amber-700 dark:text-amber-400',   bg: 'bg-amber-50 dark:bg-amber-900/20',   border: 'border-amber-200 dark:border-amber-800/50',   bar: 'bg-amber-400'  },
  healthy:  { label: 'Healthy',  Icon: CheckCircleIcon,          color: 'text-green-700 dark:text-green-400',   bg: 'bg-green-50 dark:bg-green-900/20',   border: 'border-green-200 dark:border-green-800/50',   bar: 'bg-green-500'  },
  strong:   { label: 'Strong',   Icon: ShieldCheckIcon,          color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800/50', bar: 'bg-emerald-500'},
}

const EF_ADVICE: Record<EFStatus, string> = {
  critical: 'Less than 1 month of coverage is a serious vulnerability. A single major expense — hospital visit, job loss, car breakdown — could push you into debt immediately. Start with a small, consistent monthly transfer to a dedicated savings account, even Rp 200–500K/month helps.',
  low:      'At this level, one disruption (PHK, medical emergency, appliance breakdown) could wipe your buffer. Focus on reaching 3 months first before aggressively investing elsewhere — the stability is worth more than the extra returns.',
  building: 'You have a working buffer for short emergencies. Good progress. Keep adding to it until you hit 6 months, especially if you have variable income, dependents, or a single-income household.',
  healthy:  'You\'ve hit the classic 6-month target — enough to cover job transitions, unexpected medical costs, or major home repairs without going into debt. Maintain it; inflation quietly erodes its value over time.',
  strong:   'Excellent cushion. This level is especially valuable for freelancers, entrepreneurs, or anyone with irregular income. Consider whether excess beyond 12 months could be working harder in higher-yield instruments (e.g., Reksa Dana Pasar Uang).',
}

const HOUSEHOLD_META: Record<HouseholdType, {
  label: string; desc: string; target: number; minOk: number; strong: number
}> = {
  single:   { label: 'Single',               desc: 'No dependents',                    target: 6,  minOk: 3, strong: 9  },
  couple:   { label: 'Couple (dual income)',  desc: 'Two incomes, no/few dependents',   target: 6,  minOk: 3, strong: 9  },
  family:   { label: 'Sole breadwinner',      desc: 'One income, dependents rely on me', target: 9,  minOk: 6, strong: 12 },
  'family+': { label: 'Family (many deps.)',  desc: 'Multiple dependents or irregular income', target: 12, minOk: 9, strong: 15 },
}

function EmergencyFundSection({
  months,
  avgMonthlyExpense,
  expenseBreakdown,
  householdType,
  onHouseholdChange,
}: {
  months: number
  avgMonthlyExpense: number
  expenseBreakdown: { category: string; avg: number; amortised: boolean; topTxns: { detail: string; amount: number; monthKey: string }[] }[]
  householdType: HouseholdType
  onHouseholdChange: (v: HouseholdType) => void
}) {
  const [showBreakdown, setShowBreakdown] = useState(false)
  const [expandedCat, setExpandedCat]   = useState<string | null>(null)

  const hh = HOUSEHOLD_META[householdType]
  const TARGET = hh.target

  const status: EFStatus =
    months >= hh.strong  ? 'strong' :
    months >= hh.target  ? 'healthy' :
    months >= hh.minOk   ? 'building' :
    months >= 1          ? 'low' : 'critical'

  const s = EF_STATUS[status]
  const pct = Math.min(100, (months / TARGET) * 100)
  const amountToTarget = Math.max(0, TARGET - months) * avgMonthlyExpense

  return (
    <div className={`rounded-2xl border p-5 ${s.bg} ${s.border}`}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-2.5">
          <s.Icon className={`w-5 h-5 ${s.color}`} />
          <div>
            <div className="flex items-center gap-1">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Emergency Fund</p>
              <InfoTooltip align="left" content={
                <div className="space-y-2">
                  <p className="font-semibold text-gray-700 dark:text-gray-200">What is an Emergency Fund?</p>
                  <p>Money set aside for unexpected events: job loss, medical emergency, appliance breakdown, urgent travel.</p>
                  <p>Kept in liquid accounts (tabungan/savings) — <strong>not</strong> gold or investments that take time to sell.</p>
                  <div className="pt-1 border-t border-gray-100 dark:border-gray-700 space-y-1">
                    <p className="font-medium text-gray-600 dark:text-gray-300">Recommended by household type:</p>
                    <p><span className="font-medium">Single / Couple</span> — 3–6 months</p>
                    <p><span className="font-medium">Sole breadwinner</span> — 6–9 months</p>
                    <p><span className="font-medium">Family + many dependents</span> — 9–12 months</p>
                  </div>
                  <p className="text-gray-400 dark:text-gray-500">Select your household type below to adjust the target.</p>
                </div>
              } />
            </div>
            <p className={`text-xs font-semibold ${s.color}`}>{s.label}</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className={`text-2xl font-bold ${s.color}`}>{months.toFixed(1)}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">months covered</p>
        </div>
      </div>

      {/* Household type selector */}
      <div className="mb-3">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">My household:</p>
        <div className="flex flex-wrap gap-1.5">
          {(Object.entries(HOUSEHOLD_META) as [HouseholdType, typeof HOUSEHOLD_META[HouseholdType]][]).map(([key, meta]) => (
            <button
              key={key}
              onClick={() => onHouseholdChange(key)}
              title={meta.desc}
              className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors border ${
                householdType === key
                  ? `${s.color} bg-white/80 dark:bg-black/30 border-current`
                  : 'text-gray-500 dark:text-gray-400 bg-white/50 dark:bg-black/20 border-transparent hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              {meta.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          Target: {hh.minOk}–{hh.target} months · {hh.desc}
        </p>
      </div>

      {/* Progress bar — 0 to TARGET months, min marker at minOk */}
      <div className="mb-4">
        <div className="relative h-3 bg-white/70 dark:bg-black/20 rounded-full overflow-visible mb-1.5">
          <div
            className={`h-full rounded-full transition-all ${s.bar}`}
            style={{ width: `${pct}%` }}
          />
          {/* minOk marker */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-gray-400/50 rounded"
            style={{ left: `${(hh.minOk / TARGET) * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400">
          <span>0</span>
          <span>{hh.minOk} mo <span className="text-gray-300">(min)</span></span>
          <span>{hh.target} mo <span className="text-gray-300">(target)</span></span>
        </div>
      </div>

      {/* Advice */}
      <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
        {EF_ADVICE[status]}
      </p>

      {/* Amount needed / context row */}
      <div className="flex flex-wrap gap-3">
        {amountToTarget > 0 && (
          <div className="bg-white/60 dark:bg-black/20 rounded-lg px-3 py-2 text-xs">
            <span className="text-gray-500 dark:text-gray-400">To reach {hh.target} months: </span>
            <span className="font-semibold text-gray-800 dark:text-gray-200">{formatIDRFull(amountToTarget)}</span>
          </div>
        )}
        {avgMonthlyExpense > 0 && (
          <div className="bg-white/60 dark:bg-black/20 rounded-lg px-3 py-2 text-xs w-full">
            <button
              onClick={() => setShowBreakdown(v => !v)}
              className="flex items-center justify-between w-full"
            >
              <span>
                <span className="text-gray-500 dark:text-gray-400">Avg monthly expenses: </span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">{formatIDRFull(avgMonthlyExpense)}</span>
              </span>
              <svg
                className={`w-3.5 h-3.5 text-gray-400 transition-transform shrink-0 ml-2 ${showBreakdown ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>

            {showBreakdown && expenseBreakdown.length > 0 && (
              <div className="mt-2 pt-2 border-t border-black/10 dark:border-white/10 space-y-1">
                <p className="text-gray-400 dark:text-gray-500 mb-1.5">Breakdown (avg/month, last 6 months):</p>
                {expenseBreakdown.map(({ category, avg, amortised, topTxns }) => {
                  const isExpanded = expandedCat === category
                  return (
                    <div key={category}>
                      <button
                        onClick={() => setExpandedCat(isExpanded ? null : category)}
                        className="flex items-center justify-between gap-2 w-full text-left hover:opacity-80 transition"
                      >
                        <span className="text-gray-600 dark:text-gray-400 truncate">
                          {category}
                          {amortised && <span className="ml-1 text-gray-400 dark:text-gray-500">(÷12)</span>}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="font-medium text-gray-800 dark:text-gray-200 tabular-nums">{formatIDRFull(avg)}</span>
                          <svg className={`w-3 h-3 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                          </svg>
                        </div>
                      </button>
                      {isExpanded && topTxns.length > 0 && (
                        <div className="mt-1 mb-1 ml-2 space-y-0.5 border-l-2 border-black/10 dark:border-white/10 pl-2">
                          {topTxns.map((tx, i) => (
                            <div key={i} className="flex items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
                              <span className="truncate">{tx.detail}</span>
                              <span className="shrink-0 tabular-nums text-gray-700 dark:text-gray-300">{formatIDRFull(tx.amount)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
                <p className="text-gray-400 dark:text-gray-500 pt-1 border-t border-black/10 dark:border-white/10">
                  Excludes Transfer, Bank Charges, Loan.
                  (÷12) = infrequent payment amortised annually so one-time costs don&apos;t inflate the monthly average.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* What counts as emergency fund */}
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 leading-relaxed">
        Calculated from savings accounts marked as emergency fund. Ideal: liquid, low-risk accounts
        (tabungan, deposito) — not gold or investments that take time to liquidate.
      </p>
    </div>
  )
}

// ── Liquid Coverage Section ────────────────────────────────────────────────────

function LiquidCoverageSection({
  months,
  totalLiquid,
}: {
  months: number
  totalLiquid: number
}) {
  const status = months >= 12 ? 'excellent' : months >= 6 ? 'healthy' : months >= 3 ? 'adequate' : 'low'

  const meta = {
    excellent: { label: 'Excellent', color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800/50', bar: 'bg-emerald-500' },
    healthy:   { label: 'Healthy',   color: 'text-green-700 dark:text-green-400',     bg: 'bg-green-50 dark:bg-green-900/20',     border: 'border-green-200 dark:border-green-800/50',     bar: 'bg-green-500'   },
    adequate:  { label: 'Adequate',  color: 'text-amber-700 dark:text-amber-400',     bg: 'bg-amber-50 dark:bg-amber-900/20',     border: 'border-amber-200 dark:border-amber-800/50',     bar: 'bg-amber-400'   },
    low:       { label: 'Low',       color: 'text-orange-700 dark:text-orange-400',   bg: 'bg-orange-50 dark:bg-orange-900/20',   border: 'border-orange-200 dark:border-orange-800/50',   bar: 'bg-orange-400'  },
  }[status]

  const pct = Math.min(100, (months / 12) * 100)

  return (
    <div className={`rounded-2xl border p-5 ${meta.bg} ${meta.border}`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <div className="flex items-center gap-1">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Liquid Coverage</p>
            <InfoTooltip align="left" content={
              <div className="space-y-2">
                <p className="font-semibold text-gray-700 dark:text-gray-200">What is Liquid Coverage?</p>
                <p>How many months your <strong>total savings</strong> (all accounts) could cover your expenses.</p>
                <p>Broader than the Emergency Fund — it includes your Mandiri payroll account and every savings account, not just the ones you designated as emergency fund.</p>
                <div className="pt-1 border-t border-gray-100 dark:border-gray-700 space-y-1">
                  <p><span className="font-medium text-emerald-600 dark:text-emerald-400">12+ months</span> — Excellent liquidity buffer</p>
                  <p><span className="font-medium text-green-600 dark:text-green-400">6–11 months</span> — Healthy overall position</p>
                  <p><span className="font-medium text-amber-600 dark:text-amber-400">3–5 months</span> — Adequate but could be stronger</p>
                  <p><span className="font-medium text-orange-600 dark:text-orange-400">{'<'}3 months</span> — Low — prioritize building liquid savings</p>
                </div>
                <p className="text-gray-400 dark:text-gray-500">Use both metrics together: Emergency Fund for dedicated buffer, Liquid Coverage for the full picture.</p>
              </div>
            } />
          </div>
          <p className={`text-xs font-semibold ${meta.color}`}>{meta.label}</p>
        </div>
        <div className="text-right shrink-0">
          <p className={`text-2xl font-bold ${meta.color}`}>{months.toFixed(1)}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">months total</p>
        </div>
      </div>

      {/* Bar — target 12 months */}
      <div className="mb-3">
        <div className="h-2.5 bg-white/70 dark:bg-black/20 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${meta.bar}`} style={{ width: `${pct}%` }} />
        </div>
        <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-1">
          <span>0</span>
          <span>6 mo</span>
          <span>12 mo</span>
        </div>
      </div>

      <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
        {status === 'excellent'
          ? `All your savings cover ${months.toFixed(1)} months of expenses — strong liquidity position.`
          : status === 'healthy'
          ? `${months.toFixed(1)} months of expenses across all savings accounts — good overall buffer.`
          : status === 'adequate'
          ? `${months.toFixed(1)} months covered. Consider growing total savings for more flexibility.`
          : `Only ${months.toFixed(1)} months of expenses in savings. Build liquid assets as a priority.`}
      </p>

      <div className="bg-white/60 dark:bg-black/20 rounded-lg px-3 py-2 text-xs">
        <span className="text-gray-500 dark:text-gray-400">Total liquid savings: </span>
        <span className="font-semibold text-gray-800 dark:text-gray-200">{formatIDRFull(totalLiquid)}</span>
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 leading-relaxed">
        Includes <strong>all</strong> savings accounts — unlike the emergency fund which counts only designated accounts.
        Vehicle and property assets are excluded as they are illiquid (cannot be quickly sold in an emergency).
      </p>
    </div>
  )
}

// ── Net Worth Trend Chart ──────────────────────────────────────────────────────

function NetWorthTrendChart({ snapshots }: { snapshots: NetWorthSnapshot[] }) {
  const byMonth: Record<string, number> = {}
  for (const s of snapshots) byMonth[s.date.slice(0, 7)] = s.value
  const monthly = Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
  if (monthly.length < 2) return null

  const W = 400, H = 80
  const padL = 52, padR = 8, padT = 8, padB = 22
  const cW = W - padL - padR
  const cH = H - padT - padB

  const vals = monthly.map(([, v]) => v)
  const lo = Math.min(...vals)
  const hi = Math.max(...vals)
  const range = hi - lo || hi * 0.05 || 1

  const xi = (i: number) => padL + (i / (monthly.length - 1)) * cW
  const yi = (v: number) => padT + cH - ((v - lo) / range) * cH

  const pts = monthly.map(([, v], i) => `${xi(i)},${yi(v)}`).join(' ')
  const lastPt = { x: xi(monthly.length - 1), y: yi(vals[vals.length - 1]) }
  const firstPt = { x: xi(0), y: yi(vals[0]) }
  const areaD =
    `M ${firstPt.x} ${firstPt.y} ` +
    monthly.slice(1).map(([, v], i) => `L ${xi(i + 1)} ${yi(v)}`).join(' ') +
    ` L ${lastPt.x} ${padT + cH} L ${firstPt.x} ${padT + cH} Z`

  const fmtY = (n: number) =>
    n >= 1_000_000_000 ? `${(n / 1_000_000_000).toFixed(1)}M` :
    n >= 1_000_000     ? `${(n / 1_000_000).toFixed(0)}jt`    :
    n >= 1_000         ? `${(n / 1_000).toFixed(0)}rb`        :
    String(Math.round(n))

  const labelIdxs =
    monthly.length <= 3 ? monthly.map((_, i) => i) :
    monthly.length <= 6 ? [0, Math.floor(monthly.length / 2), monthly.length - 1] :
    [0, Math.floor(monthly.length / 3), Math.floor(2 * monthly.length / 3), monthly.length - 1]

  return (
    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Net Worth Trend</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 80 }} preserveAspectRatio="none">
        <defs>
          <linearGradient id="nwAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.01" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((t, i) => (
          <line key={i} x1={padL} y1={padT + cH * (1 - t)} x2={padL + cW} y2={padT + cH * (1 - t)}
            stroke="#e5e7eb" strokeWidth="0.5" />
        ))}
        <path d={areaD} fill="url(#nwAreaGrad)" />
        <polyline points={pts} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={lastPt.x} cy={lastPt.y} r="3" fill="#6366f1" />
        <text x={padL - 4} y={padT + 6} textAnchor="end" style={{ fontSize: 9, fill: '#9ca3af', fontFamily: 'system-ui' }}>
          {fmtY(hi)}
        </text>
        <text x={padL - 4} y={padT + cH} textAnchor="end" style={{ fontSize: 9, fill: '#9ca3af', fontFamily: 'system-ui' }}>
          {fmtY(lo)}
        </text>
        {labelIdxs.map(i => {
          const [m] = monthly[i]
          const d = new Date(m + '-01')
          const label = d.toLocaleDateString('en-US', { month: 'short' }) + " '" + String(d.getFullYear()).slice(2)
          const anchor = i === 0 ? 'start' : i === monthly.length - 1 ? 'end' : 'middle'
          return (
            <text key={i} x={xi(i)} y={H - 4} textAnchor={anchor} style={{ fontSize: 8, fill: '#9ca3af', fontFamily: 'system-ui' }}>
              {label}
            </text>
          )
        })}
      </svg>
    </div>
  )
}

// ── Asset Sparkline ────────────────────────────────────────────────────────────

function AssetSparkline({ snapshots }: { snapshots: AssetSnapshot[] }) {
  const byMonth: Record<string, number> = {}
  for (const s of snapshots) byMonth[s.date.slice(0, 7)] = s.value
  const monthly = Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
  if (monthly.length < 2) return null

  const W = 100, H = 28
  const vals = monthly.map(([, v]) => v)
  const lo = Math.min(...vals)
  const hi = Math.max(...vals)
  const range = hi - lo || hi * 0.05 || 1
  const up = vals[vals.length - 1] >= vals[0]
  const stroke = up ? '#22c55e' : '#ef4444'

  const xi = (i: number) => (i / (monthly.length - 1)) * W
  const yi = (v: number) => H - 2 - ((v - lo) / range) * (H - 6)

  const points = monthly.map(([, v], i) => ({ x: xi(i), y: yi(v) }))
  const pts = points.map(p => `${p.x},${p.y}`).join(' ')
  const areaD =
    `M ${points[0].x} ${points[0].y} ` +
    points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ') +
    ` L ${points[points.length - 1].x} ${H} L 0 ${H} Z`
  const last = points[points.length - 1]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-7" preserveAspectRatio="none">
      <path d={areaD} fill={stroke} fillOpacity="0.1" />
      <polyline points={pts} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last.x} cy={last.y} r="2" fill={stroke} />
    </svg>
  )
}

// ── Asset Card ─────────────────────────────────────────────────────────────────

interface CardProps {
  asset: Asset
  meta: { label: string; color: string; bg: string; Icon: IconComponent }
  avgMonthlyExpense: number
  snapshots: AssetSnapshot[]
  onEdit: () => void
  onDelete: () => void
}

function AssetCard({ asset, meta, avgMonthlyExpense, snapshots, onEdit, onDelete }: CardProps) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const nowMs = useMemo(() => Date.now(), [])
  const stale = isStale(asset.updatedAt)
  const staleDays = stale ? daysSince(asset.updatedAt) : 0

  // Find the most recent snapshot ≥25 days old for growth comparison
  const assetGrowth = useMemo(() => {
    if (snapshots.length < 2) return null
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 25)
    const cutoffStr = cutoff.toISOString().split('T')[0]
    const older = snapshots.filter(s => s.date <= cutoffStr)
    if (!older.length) return null
    const prev = older[older.length - 1]
    const change = asset.currentValue - prev.value
    const pct = prev.value > 0 ? (change / prev.value) * 100 : 0
    return { change, pct, since: prev.date }
  }, [snapshots, asset.currentValue])
  const pocketProgress = asset.type === 'pocket' && asset.goalTarget
    ? Math.min(100, (asset.currentValue / asset.goalTarget) * 100)
    : null

  const efMonths = asset.type === 'savings' && asset.isEmergencyFund && avgMonthlyExpense > 0
    ? asset.currentValue / avgMonthlyExpense
    : null

  return (
    <div className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-sm`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${meta.bg} ${meta.color}`}>
              <meta.Icon className="w-3 h-3" />{meta.label}
            </span>
            {asset.isEmergencyFund && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/50 text-green-700 dark:text-green-400">
                Emergency Fund
              </span>
            )}
            {stale && (
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 text-amber-700 dark:text-amber-400">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                {staleDays}d old
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-2 truncate">{asset.name}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">{asset.institution}</p>
        </div>

        <div className="flex gap-1 shrink-0">
          <button
            onClick={onEdit}
            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </button>
        </div>
      </div>

      {/* Value + growth */}
      <div className="mt-3">
        <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{formatIDRFull(asset.currentValue)}</p>
        {assetGrowth !== null && (
          <p className={`text-xs font-medium mt-0.5 ${assetGrowth.change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
            {assetGrowth.change >= 0 ? '↑' : '↓'} {formatIDR(Math.abs(assetGrowth.change))}
            {' '}({Math.abs(assetGrowth.pct).toFixed(1)}%)
            <span className="text-gray-400 font-normal ml-1">
              since {new Date(assetGrowth.since).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </p>
        )}
      </div>

      {/* Sparkline — last 6 months value history */}
      {snapshots.length >= 2 && (
        <div className="mt-2">
          <AssetSparkline snapshots={snapshots} />
        </div>
      )}

      {/* Type-specific detail */}
      <div className="mt-2 space-y-1.5">
        {asset.interestRate != null && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Interest: <span className="font-medium text-green-600 dark:text-green-400">{asset.interestRate}% p.a.</span>
          </p>
        )}

        {efMonths !== null && (
          <p className={`text-xs font-medium ${
            efMonths >= 6 ? 'text-green-600 dark:text-green-400' : efMonths >= 3 ? 'text-amber-600 dark:text-amber-400' : 'text-red-500 dark:text-red-400'
          }`}>
            {efMonths.toFixed(1)} months of expenses covered
          </p>
        )}

        {asset.goldGrams != null && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Weight: <span className="font-medium">{asset.goldGrams}g</span>
            {asset.goldGrams > 0 && (
              <span className="text-gray-400 dark:text-gray-500 ml-1">
                (≈ Rp {Math.round(asset.currentValue / asset.goldGrams).toLocaleString('id-ID')}/g)
              </span>
            )}
          </p>
        )}

        {asset.platform && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Type: <span className="font-medium">{asset.platform}</span>
          </p>
        )}

        {asset.type === 'investment' && (
          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${
            asset.contributable !== false
              ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800/50 text-green-700 dark:text-green-400'
              : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'
          }`}>
            {asset.contributable !== false
              ? <><CheckIcon className="w-3 h-3" /> Can top up</>
              : <><LockClosedIcon className="w-3 h-3" /> Auto-managed</>}
          </span>
        )}

        {asset.type === 'pocket' && asset.goalName && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Goal: <span className="font-medium">{asset.goalName}</span>
            {asset.goalDeadline && (
              <span className="text-gray-400 dark:text-gray-500 ml-1">
                · {new Date(asset.goalDeadline + '-01').toLocaleString('en-US', { month: 'short', year: 'numeric' })}
              </span>
            )}
          </p>
        )}

        {pocketProgress !== null && asset.goalTarget && (
          <div>
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span>{Math.round(pocketProgress)}% of target</span>
              <span>{formatIDR(asset.goalTarget)}</span>
            </div>
            <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  pocketProgress >= 100 ? 'bg-green-500' : 'bg-purple-500'
                }`}
                style={{ width: `${pocketProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Foreign currency details */}
        {asset.currency && asset.currency !== 'IDR' && asset.foreignAmount && (
          <div className="mt-1 space-y-0.5">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              <span className="font-medium">{asset.foreignAmount.toLocaleString()} {asset.currency}</span>
              {asset.exchangeRate && (
                <span className="text-gray-400 dark:text-gray-500 ml-1">
                  @ Rp {Math.round(asset.exchangeRate).toLocaleString('id-ID')}/{asset.currency}
                </span>
              )}
            </p>
            {asset.exchangeRateUpdatedAt && (() => {
              const days = Math.floor((nowMs - new Date(asset.exchangeRateUpdatedAt!).getTime()) / 86400000)
              const staleRate = days > 7
              return (
                <p className={`text-xs ${staleRate ? 'text-amber-500 dark:text-amber-400' : 'text-gray-400 dark:text-gray-500'}`}>
                  Rate {staleRate ? `${days}d old — tap edit to refresh` : `updated ${days === 0 ? 'today' : `${days}d ago`}`}
                </p>
              )
            })()}
          </div>
        )}

        {/* Vehicle / Property details */}
        {(asset.type === 'vehicle' || asset.type === 'property') && asset.purchasePrice && asset.purchaseYear && (
          <div className="mt-1 space-y-1">
            {asset.physicalSubtype && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Type: <span className="font-medium">{SUBTYPE_LABELS[asset.physicalSubtype] ?? asset.physicalSubtype}</span>
              </p>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Purchased: <span className="font-medium">{asset.purchaseYear}</span>
              <span className="text-gray-400 dark:text-gray-500 ml-1">for {formatIDR(asset.purchasePrice)}</span>
            </p>
            {asset.annualChangeRate != null && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Annual rate:{' '}
                <span className={`font-medium ${asset.annualChangeRate < 0 ? 'text-red-500 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                  {asset.annualChangeRate > 0 ? '+' : ''}{asset.annualChangeRate}%/yr
                </span>
              </p>
            )}
            {asset.annualChangeRate != null && (() => {
              const est = computeEstimatedValue(asset.purchasePrice!, asset.purchaseYear!, asset.annualChangeRate!)
              const diff = asset.currentValue - est
              const absDiff = Math.abs(diff)
              return (
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Est. today:{' '}
                  <span className="font-medium text-gray-700 dark:text-gray-300">{formatIDR(est)}</span>
                  {absDiff > 0 && (
                    <span className={`ml-1 ${diff > 0 ? 'text-green-600 dark:text-green-400' : 'text-amber-500 dark:text-amber-400'}`}>
                      ({diff > 0 ? '+' : '-'}{formatIDR(absDiff)} vs estimate)
                    </span>
                  )}
                </p>
              )
            })()}
          </div>
        )}

        {asset.notes && (
          <p className="text-xs text-gray-400 dark:text-gray-500 italic">{asset.notes}</p>
        )}
      </div>

      <p className={`text-xs mt-3 ${stale ? 'text-amber-500 dark:text-amber-400' : 'text-gray-300 dark:text-gray-600'}`}>
        {relativeDate(asset.updatedAt)}
        {stale && ' · update recommended'}
      </p>
    </div>
  )
}
