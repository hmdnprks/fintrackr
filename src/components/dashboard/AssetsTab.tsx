'use client'

import { useState, useMemo } from 'react'
import { Asset, AssetType, getAssets, deleteAsset } from '@/lib/assetStorage'
import AssetModal from './AssetModal'

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

const TYPE_META: Record<AssetType, { label: string; emoji: string; color: string; bg: string }> = {
  savings:    { label: 'Savings',    emoji: '🏦', color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-100'    },
  gold:       { label: 'Gold',       emoji: '🥇', color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-100'},
  investment: { label: 'Investment', emoji: '📈', color: 'text-green-700',  bg: 'bg-green-50 border-green-100'  },
  pocket:     { label: 'Pocket',     emoji: '🎯', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-100'},
  other:      { label: 'Other',      emoji: '📦', color: 'text-gray-700',   bg: 'bg-gray-50 border-gray-200'   },
}

const TYPE_ORDER: AssetType[] = ['savings', 'gold', 'investment', 'pocket', 'other']

function relativeDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000)
  if (diffDays === 0) return 'Updated today'
  if (diffDays === 1) return 'Updated yesterday'
  if (diffDays < 30)  return `Updated ${diffDays}d ago`
  const diffMonths = Math.floor(diffDays / 30)
  if (diffMonths < 12) return `Updated ${diffMonths}mo ago`
  return `Updated ${Math.floor(diffMonths / 12)}y ago`
}

export default function AssetsTab({ statements }: Props) {
  const [assets, setAssets] = useState<Asset[]>(() => getAssets())
  const [showModal, setShowModal]     = useState(false)
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  function reload() {
    setAssets(getAssets())
  }

  // Average monthly expense from last 6 months of statements
  const avgMonthlyExpense = useMemo(() => {
    if (!statements.length) return 0
    const monthlyTotals: Record<string, number> = {}
    for (const s of statements) {
      if (!s.monthKey) continue
      let total = 0
      for (const tx of s.transactions || []) {
        if (tx.type === 'debit') total += tx.amount || 0
      }
      monthlyTotals[s.monthKey] = total
    }
    const values = Object.values(monthlyTotals).filter(v => v > 0)
    if (!values.length) return 0
    const recent = values.sort().reverse().slice(0, 6)
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
          <h2 className="text-lg font-semibold text-gray-900">Assets</h2>
          <p className="text-sm text-gray-400 mt-0.5">Track your savings, gold, investments, and goal pockets</p>
        </div>
        <button
          onClick={() => { setEditingAsset(null); setShowModal(true) }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Asset
        </button>
      </div>

      {/* Net worth summary */}
      {assets.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-baseline justify-between mb-4">
            <div>
              <p className="text-sm text-gray-500">Total Net Worth</p>
              <p className="text-3xl font-bold text-gray-900 mt-0.5">{formatIDRFull(totalNetWorth)}</p>
            </div>
            {emergencyMonths !== null && (
              <div className={`text-right px-3 py-2 rounded-xl text-sm ${
                emergencyMonths >= 6 ? 'bg-green-50 text-green-700' :
                emergencyMonths >= 3 ? 'bg-amber-50 text-amber-700' :
                'bg-red-50 text-red-700'
              }`}>
                <p className="font-semibold">{emergencyMonths.toFixed(1)} months</p>
                <p className="text-xs opacity-75">emergency fund</p>
              </div>
            )}
          </div>

          {/* Breakdown bars */}
          <div className="space-y-2">
            {TYPE_ORDER.filter(t => totalByType[t] > 0).map(t => {
              const meta = TYPE_META[t]
              const pct = totalNetWorth > 0 ? (totalByType[t] / totalNetWorth) * 100 : 0
              return (
                <div key={t} className="flex items-center gap-3">
                  <span className="text-sm w-24 text-gray-500 shrink-0">{meta.emoji} {meta.label}</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
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
                  <span className="text-sm font-medium text-gray-700 w-28 text-right shrink-0">
                    {formatIDR(totalByType[t])}
                  </span>
                  <span className="text-xs text-gray-400 w-10 text-right shrink-0">
                    {Math.round(pct)}%
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Asset cards grouped by type */}
      {assets.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <div className="text-4xl mb-3">💼</div>
          <h3 className="text-base font-semibold text-gray-700">No assets yet</h3>
          <p className="text-sm text-gray-400 mt-1 max-w-xs mx-auto">
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
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                {meta.emoji} {meta.label}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {groupedAssets[t].map(asset => (
                  <AssetCard
                    key={asset.id}
                    asset={asset}
                    meta={meta}
                    avgMonthlyExpense={avgMonthlyExpense}
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
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm z-10">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Delete asset?</h3>
            <p className="text-sm text-gray-500 mb-5">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
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
    </div>
  )
}

// ── Asset Card ─────────────────────────────────────────────────────────────────

interface CardProps {
  asset: Asset
  meta: { label: string; emoji: string; color: string; bg: string }
  avgMonthlyExpense: number
  onEdit: () => void
  onDelete: () => void
}

function AssetCard({ asset, meta, avgMonthlyExpense, onEdit, onDelete }: CardProps) {
  const pocketProgress = asset.type === 'pocket' && asset.goalTarget
    ? Math.min(100, (asset.currentValue / asset.goalTarget) * 100)
    : null

  const efMonths = asset.type === 'savings' && asset.isEmergencyFund && avgMonthlyExpense > 0
    ? asset.currentValue / avgMonthlyExpense
    : null

  return (
    <div className={`bg-white border rounded-2xl p-4 shadow-sm`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${meta.bg} ${meta.color}`}>
              {meta.emoji} {meta.label}
            </span>
            {asset.isEmergencyFund && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 border border-green-100 text-green-700">
                Emergency Fund
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-gray-900 mt-2 truncate">{asset.name}</p>
          <p className="text-xs text-gray-400">{asset.institution}</p>
        </div>

        <div className="flex gap-1 shrink-0">
          <button
            onClick={onEdit}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </button>
        </div>
      </div>

      {/* Value */}
      <p className="text-xl font-bold text-gray-900 mt-3">
        {formatIDRFull(asset.currentValue)}
      </p>

      {/* Type-specific detail */}
      <div className="mt-2 space-y-1.5">
        {asset.interestRate != null && (
          <p className="text-xs text-gray-500">
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
          <p className="text-xs text-gray-500">
            Weight: <span className="font-medium">{asset.goldGrams}g</span>
            {asset.goldGrams > 0 && (
              <span className="text-gray-400 ml-1">
                (≈ Rp {Math.round(asset.currentValue / asset.goldGrams).toLocaleString('id-ID')}/g)
              </span>
            )}
          </p>
        )}

        {asset.platform && (
          <p className="text-xs text-gray-500">
            Type: <span className="font-medium">{asset.platform}</span>
          </p>
        )}

        {asset.type === 'pocket' && asset.goalName && (
          <p className="text-xs text-gray-500">
            Goal: <span className="font-medium">{asset.goalName}</span>
            {asset.goalDeadline && (
              <span className="text-gray-400 ml-1">
                · {new Date(asset.goalDeadline + '-01').toLocaleString('en-US', { month: 'short', year: 'numeric' })}
              </span>
            )}
          </p>
        )}

        {pocketProgress !== null && asset.goalTarget && (
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{Math.round(pocketProgress)}% of target</span>
              <span>{formatIDR(asset.goalTarget)}</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
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
          <p className="text-xs text-gray-400 italic">{asset.notes}</p>
        )}
      </div>

      <p className="text-xs text-gray-300 mt-3">{relativeDate(asset.updatedAt)}</p>
    </div>
  )
}
