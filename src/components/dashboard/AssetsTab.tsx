'use client'

import { useState, useMemo } from 'react'
import { Asset, AssetType, getAssets, deleteAsset, getNetWorthSnapshots, getAssetSnapshots, NetWorthSnapshot, AssetSnapshot } from '@/lib/assetStorage'
import AssetModal from './AssetModal'
import WindfallModal from './WindfallModal'
import RebalanceModal from './RebalanceModal'

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
  CheckIcon, LockClosedIcon, BriefcaseIcon,
} from '@heroicons/react/24/outline'

type IconComponent = React.ComponentType<{ className?: string }>

const TYPE_META: Record<AssetType, { label: string; color: string; bg: string; Icon: IconComponent }> = {
  savings:    { label: 'Savings',    color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-100',    Icon: BanknotesIcon       },
  gold:       { label: 'Gold',       color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-100', Icon: StarIcon             },
  investment: { label: 'Investment', color: 'text-green-700',  bg: 'bg-green-50 border-green-100',   Icon: ArrowTrendingUpIcon  },
  pocket:     { label: 'Pocket',     color: 'text-purple-700', bg: 'bg-purple-50 border-purple-100', Icon: WalletIcon           },
  other:      { label: 'Other',      color: 'text-gray-700',   bg: 'bg-gray-50 border-gray-200',     Icon: ArchiveBoxIcon       },
}

const TYPE_ORDER: AssetType[] = ['savings', 'gold', 'investment', 'pocket', 'other']

function relativeDate(iso: string) {
  const d = new Date(iso)
  const dateStr = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  const timeStr = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  return `Updated: ${dateStr} ${timeStr}`
}

export default function AssetsTab({ statements }: Props) {
  const [assets, setAssets] = useState<Asset[]>(() => getAssets())
  const [snapshots, setSnapshots]         = useState<NetWorthSnapshot[]>(() => getNetWorthSnapshots())
  const [assetSnapshots, setAssetSnapshots] = useState<AssetSnapshot[]>(() => getAssetSnapshots())
  const [showModal, setShowModal]         = useState(false)
  const [showWindfall, setShowWindfall]   = useState(false)
  const [showRebalance, setShowRebalance] = useState(false)
  const [editingAsset, setEditingAsset]   = useState<Asset | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  function reload() {
    setAssets(getAssets())
    setSnapshots(getNetWorthSnapshots())
    setAssetSnapshots(getAssetSnapshots())
  }

  // Average real monthly expense from the 6 most recent months.
  // Excludes Transfer and Bank Charges — these are financial movements
  // (credit card payments, e-wallet top-ups) not actual spending.
  const avgMonthlyExpense = useMemo(() => {
    if (!statements.length) return 0
    const EXCLUDE = new Set(['Transfer', 'Bank Charges'])
    const monthlyTotals: Record<string, number> = {}
    for (const s of statements) {
      if (!s.monthKey) continue
      let total = 0
      for (const tx of s.transactions || []) {
        if (tx.type === 'debit' && !EXCLUDE.has(tx.category)) {
          total += tx.amount || 0
        }
      }
      monthlyTotals[s.monthKey] = total
    }
    // Sort by monthKey (YYYY-MM) chronologically, take the 6 most recent
    const recent = Object.entries(monthlyTotals)
      .filter(([, v]) => v > 0)
      .sort(([a], [b]) => b.localeCompare(a))  // descending → most recent first
      .slice(0, 6)
      .map(([, v]) => v)
    if (!recent.length) return 0
    return recent.reduce((s, v) => s + v, 0) / recent.length
  }, [statements])

  const totalByType = useMemo(() => {
    const map: Record<string, number> = {}
    for (const a of assets) {
      map[a.type] = (map[a.type] || 0) + a.currentValue
    }
    return map
  }, [assets])

  const totalNetWorth = Object.values(totalByType).reduce((s, v) => s + v, 0)

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
              <p className="text-xs mt-0.5 text-gray-400 dark:text-gray-500">
                {lastUpdatedLabel.label}
              </p>
            )}
            {netWorthGrowth !== null && (
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <span className={`inline-flex items-center gap-1 text-sm font-semibold ${netWorthGrowth.change >= 0 ? 'text-green-600' : 'text-red-500'}`}>
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

          {/* Breakdown bars */}
          <div className="space-y-2.5">
            {TYPE_ORDER.filter(t => totalByType[t] > 0).map(t => {
              const meta = TYPE_META[t]
              const pct = totalNetWorth > 0 ? (totalByType[t] / totalNetWorth) * 100 : 0
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
                        'bg-gray-400'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Liquidity metrics — emergency fund + liquid coverage side by side on desktop */}
      {(emergencyMonths !== null || liquidCoverageMonths !== null) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {emergencyMonths !== null && (
            <EmergencyFundSection
              months={emergencyMonths}
              avgMonthlyExpense={avgMonthlyExpense}
            />
          )}
          {liquidCoverageMonths !== null && (
            <LiquidCoverageSection
              months={liquidCoverageMonths.months}
              totalLiquid={liquidCoverageMonths.totalLiquid}
              avgMonthlyExpense={avgMonthlyExpense}
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
    </div>
  )
}

// ── Emergency Fund Section ────────────────────────────────────────────────────

type EFStatus = 'critical' | 'low' | 'building' | 'healthy' | 'strong'

const EF_STATUS: Record<EFStatus, {
  label: string; color: string; bg: string; border: string; bar: string; Icon: IconComponent
}> = {
  critical: { label: 'Critical', Icon: ExclamationCircleIcon,   color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200',    bar: 'bg-red-500'    },
  low:      { label: 'Low',      Icon: ExclamationTriangleIcon,  color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', bar: 'bg-orange-400' },
  building: { label: 'Building', Icon: ArrowTrendingUpIcon,      color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-200',  bar: 'bg-amber-400'  },
  healthy:  { label: 'Healthy',  Icon: CheckCircleIcon,          color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200',  bar: 'bg-green-500'  },
  strong:   { label: 'Strong',   Icon: ShieldCheckIcon,          color: 'text-emerald-700',bg: 'bg-emerald-50',border: 'border-emerald-200', bar: 'bg-emerald-500'},
}

const EF_ADVICE: Record<EFStatus, string> = {
  critical: 'Less than 1 month of coverage is a serious vulnerability. A single major expense — hospital visit, job loss, car breakdown — could push you into debt immediately. Start with a small, consistent monthly transfer to a dedicated savings account, even Rp 200–500K/month helps.',
  low:      'At this level, one disruption (PHK, medical emergency, appliance breakdown) could wipe your buffer. Focus on reaching 3 months first before aggressively investing elsewhere — the stability is worth more than the extra returns.',
  building: 'You have a working buffer for short emergencies. Good progress. Keep adding to it until you hit 6 months, especially if you have variable income, dependents, or a single-income household.',
  healthy:  'You\'ve hit the classic 6-month target — enough to cover job transitions, unexpected medical costs, or major home repairs without going into debt. Maintain it; inflation quietly erodes its value over time.',
  strong:   'Excellent cushion. This level is especially valuable for freelancers, entrepreneurs, or anyone with irregular income. Consider whether excess beyond 12 months could be working harder in higher-yield instruments (e.g., Reksa Dana Pasar Uang).',
}

function EmergencyFundSection({
  months,
  avgMonthlyExpense,
}: {
  months: number
  avgMonthlyExpense: number
}) {
  const TARGET = 6
  const status: EFStatus =
    months >= 9 ? 'strong' :
    months >= 6 ? 'healthy' :
    months >= 3 ? 'building' :
    months >= 1 ? 'low' : 'critical'

  const s = EF_STATUS[status]
  const pct = Math.min(100, (months / TARGET) * 100)
  const amountToTarget = Math.max(0, TARGET - months) * avgMonthlyExpense

  return (
    <div className={`rounded-2xl border p-5 ${s.bg} ${s.border}`}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-2.5">
          <s.Icon className={`w-5 h-5 ${s.color}`} />
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Emergency Fund</p>
            <p className={`text-xs font-semibold ${s.color}`}>{s.label}</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className={`text-2xl font-bold ${s.color}`}>{months.toFixed(1)}</p>
          <p className="text-xs text-gray-500">months covered</p>
        </div>
      </div>

      {/* Progress bar — 0 to 6 months, min marker at 3 */}
      <div className="mb-4">
        <div className="relative h-3 bg-white/70 dark:bg-black/20 rounded-full overflow-visible mb-1.5">
          <div
            className={`h-full rounded-full transition-all ${s.bar}`}
            style={{ width: `${pct}%` }}
          />
          {/* 3-month minimum marker */}
          <div className="absolute top-0 bottom-0 w-0.5 bg-gray-400/50 rounded" style={{ left: '50%' }} />
        </div>
        <div className="flex justify-between text-xs text-gray-400">
          <span>0</span>
          <span>3 mo <span className="text-gray-300">(min)</span></span>
          <span>6 mo <span className="text-gray-300">(ideal)</span></span>
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
            <span className="text-gray-500 dark:text-gray-400">To reach 6 months: </span>
            <span className="font-semibold text-gray-800 dark:text-gray-200">{formatIDRFull(amountToTarget)}</span>
          </div>
        )}
        {avgMonthlyExpense > 0 && (
          <div className="bg-white/60 dark:bg-black/20 rounded-lg px-3 py-2 text-xs">
            <span className="text-gray-500 dark:text-gray-400">Avg monthly expenses: </span>
            <span className="font-semibold text-gray-800 dark:text-gray-200">{formatIDRFull(avgMonthlyExpense)}</span>
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
  avgMonthlyExpense,
}: {
  months: number
  totalLiquid: number
  avgMonthlyExpense: number
}) {
  const status = months >= 12 ? 'excellent' : months >= 6 ? 'healthy' : months >= 3 ? 'adequate' : 'low'

  const meta = {
    excellent: { label: 'Excellent',  color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', bar: 'bg-emerald-500' },
    healthy:   { label: 'Healthy',    color: 'text-green-700',   bg: 'bg-green-50',   border: 'border-green-200',   bar: 'bg-green-500'   },
    adequate:  { label: 'Adequate',   color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200',   bar: 'bg-amber-400'   },
    low:       { label: 'Low',        color: 'text-orange-700',  bg: 'bg-orange-50',  border: 'border-orange-200',  bar: 'bg-orange-400'  },
  }[status]

  const pct = Math.min(100, (months / 12) * 100)

  return (
    <div className={`rounded-2xl border p-5 ${meta.bg} ${meta.border}`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Liquid Coverage</p>
          <p className={`text-xs font-semibold ${meta.color}`}>{meta.label}</p>
        </div>
        <div className="text-right shrink-0">
          <p className={`text-2xl font-bold ${meta.color}`}>{months.toFixed(1)}</p>
          <p className="text-xs text-gray-500">months total</p>
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
        Both metrics together give the full liquidity picture.
      </p>
    </div>
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
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 border border-green-100 text-green-700">
                Emergency Fund
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
          <p className={`text-xs font-medium mt-0.5 ${assetGrowth.change >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {assetGrowth.change >= 0 ? '↑' : '↓'} {formatIDR(Math.abs(assetGrowth.change))}
            {' '}({Math.abs(assetGrowth.pct).toFixed(1)}%)
            <span className="text-gray-400 font-normal ml-1">
              since {new Date(assetGrowth.since).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </p>
        )}
      </div>

      {/* Type-specific detail */}
      <div className="mt-2 space-y-1.5">
        {asset.interestRate != null && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Interest: <span className="font-medium text-green-600">{asset.interestRate}% p.a.</span>
          </p>
        )}

        {efMonths !== null && (
          <p className={`text-xs font-medium ${
            efMonths >= 6 ? 'text-green-600' : efMonths >= 3 ? 'text-amber-600' : 'text-red-500'
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
              ? 'bg-green-50 border-green-100 text-green-700'
              : 'bg-gray-50 border-gray-200 text-gray-500'
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

        {asset.notes && (
          <p className="text-xs text-gray-400 dark:text-gray-500 italic">{asset.notes}</p>
        )}
      </div>

      <p className="text-xs text-gray-300 dark:text-gray-600 mt-3">{relativeDate(asset.updatedAt)}</p>
    </div>
  )
}
