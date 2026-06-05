'use client'

import { useMemo, useState } from 'react'
import { detectSubscriptions, type ManualSubscription, type SubscriptionEntry } from '@/lib/subscriptions'
import { getVaultDataSync, saveVaultData } from '@/lib/storage/secureStorage'
import { normalizeDetail } from '@/lib/insights/recurring'

interface Props {
  statements: any[]
  onGoToTransactions?: (search: string) => void
}

function formatIDR(n: number) {
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}jt`
  if (n >= 1_000)     return `Rp ${Math.round(n / 1_000)}rb`
  return `Rp ${Math.round(n).toLocaleString('id-ID')}`
}

function formatIDRFull(n: number) {
  return `Rp ${Math.round(n).toLocaleString('id-ID')}`
}

function parseIDR(s: string): number {
  return Number(s.replace(/[^0-9]/g, '')) || 0
}

function formatThousands(n: number): string {
  return n.toLocaleString('id-ID')
}

function monthLabel(ym: string): string {
  const [y, m] = ym.split('-')
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

// ── Add Manual Modal ──────────────────────────────────────────────────────────

interface AddFormState {
  name: string
  amount: string
  cancelUrl: string
  notes: string
}

function AddManualModal({
  onClose,
  onSave,
}: {
  onClose: () => void
  onSave: (sub: ManualSubscription) => void
}) {
  const [form, setForm] = useState<AddFormState>({ name: '', amount: '', cancelUrl: '', notes: '' })
  const [errors, setErrors] = useState<Partial<AddFormState>>({})

  function validate() {
    const e: Partial<AddFormState> = {}
    if (!form.name.trim()) e.name = 'Name is required'
    if (!parseIDR(form.amount)) e.amount = 'Enter a monthly amount'
    return e
  }

  function handleSave() {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    onSave({
      id: crypto.randomUUID(),
      name: form.name.trim(),
      monthlyAmount: parseIDR(form.amount),
      cancelUrl: form.cancelUrl.trim() || undefined,
      notes: form.notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm z-10 p-6">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Add subscription manually</h3>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Service name</label>
            <input
              type="text"
              placeholder="e.g. iCloud 50GB"
              value={form.name}
              onChange={e => { setForm(p => ({ ...p, name: e.target.value })); setErrors(p => ({ ...p, name: '' })) }}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Monthly amount</label>
            <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
              <span className="px-2 py-2.5 text-sm text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 select-none">Rp</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={form.amount}
                onChange={e => {
                  const digits = e.target.value.replace(/[^0-9]/g, '')
                  setForm(p => ({ ...p, amount: digits ? formatThousands(Number(digits)) : '' }))
                  setErrors(p => ({ ...p, amount: '' }))
                }}
                className="flex-1 px-2 py-2.5 text-sm focus:outline-none bg-transparent min-w-0 text-gray-900 dark:text-gray-100"
              />
            </div>
            {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Cancel / manage URL <span className="text-gray-400 font-normal">— optional</span>
            </label>
            <input
              type="url"
              placeholder="https://..."
              value={form.cancelUrl}
              onChange={e => setForm(p => ({ ...p, cancelUrl: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Notes <span className="text-gray-400 font-normal">— optional</span>
            </label>
            <input
              type="text"
              placeholder="e.g. paid via GoPay"
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Subscription Row ──────────────────────────────────────────────────────────

function SubscriptionRow({ entry, onDelete, removeLabel = 'Delete', onGoToTransactions }: {
  entry: SubscriptionEntry
  onDelete?: () => void
  removeLabel?: string
  onGoToTransactions?: (search: string) => void
}) {
  const [confirmDel, setConfirmDel] = useState(false)

  return (
    <div className="flex items-start justify-between gap-3 bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3">
      <div className="flex items-start gap-3 min-w-0">
        <span className="text-xl leading-none mt-0.5 shrink-0">{entry.emoji}</span>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{entry.name}</p>
            {entry.isNew && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300">
                NEW
              </span>
            )}
            {entry.priceChange && (
              <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                entry.priceChange.direction === 'up'
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                  : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
              }`}>
                {entry.priceChange.direction === 'up' ? '▲' : '▼'}
                {Math.abs(entry.priceChange.pct)}%
              </span>
            )}
            {entry.source !== 'auto' && (
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                entry.source === 'detected'
                  ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              }`}>
                {entry.source === 'user' ? 'flagged' : entry.source === 'detected' ? 'auto-detected' : 'manual'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {entry.source === 'auto' && entry.months != null && (
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {entry.months} month{entry.months !== 1 ? 's' : ''} detected
                {entry.firstSeenMonth ? ` · since ${monthLabel(entry.firstSeenMonth)}` : ''}
              </p>
            )}
            {entry.source === 'manual' && (
              <p className="text-xs text-gray-400 dark:text-gray-500">Manually added</p>
            )}
            {entry.source === 'user' && (
              <p className="text-xs text-gray-400 dark:text-gray-500">Flagged from transactions</p>
            )}
            {entry.source === 'detected' && entry.detectedMonths && (
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Recurring: {entry.detectedMonths.map(monthLabel).join(' → ')}
              </p>
            )}
          </div>

          {entry.priceChange && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              Was {formatIDR(entry.priceChange.oldAvg)}/mo → now {formatIDR(entry.priceChange.newAvg)}/mo
            </p>
          )}

          {entry.isApple && (
            <p className="text-[10px] text-amber-500 dark:text-amber-400 mt-1">
              All App Store charges appear as one Apple entry
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="text-right">
          <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{formatIDR(entry.monthlyAmount)}</p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500">/mo</p>
        </div>

        <div className="flex items-center gap-1">
          {entry.sampleDetail && onGoToTransactions && (
            <button
              onClick={() => onGoToTransactions(entry.normKey ?? normalizeDetail(entry.sampleDetail ?? ''))}
              title="Find in transactions"
              className="p-1.5 text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
              </svg>
            </button>
          )}
          {entry.cancelUrl && (
            <a
              href={entry.cancelUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Manage / cancel"
              className="p-1.5 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
          )}

          {onDelete && !confirmDel && (
            <button
              onClick={() => setConfirmDel(true)}
              className="p-1.5 text-gray-300 hover:text-red-400 dark:text-gray-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          {onDelete && confirmDel && (
            <div className="flex items-center gap-1">
              <button
                onClick={onDelete}
                className="text-[10px] font-medium px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded-lg transition"
              >
                {removeLabel}
              </button>
              <button
                onClick={() => setConfirmDel(false)}
                className="text-[10px] font-medium px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg transition"
              >
                No
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SubscriptionManager({ statements, onGoToTransactions }: Props) {
  const [manualSubs, setManualSubs] = useState<ManualSubscription[]>(
    () => (getVaultDataSync().manualSubscriptions ?? []) as ManualSubscription[]
  )
  const [subscribedDescriptions, setSubscribedDescriptions] = useState<string[]>(
    () => (getVaultDataSync().subscribedDescriptions ?? []) as string[]
  )
  const [dismissedSubscriptions, setDismissedSubscriptions] = useState<string[]>(
    () => (getVaultDataSync().dismissedSubscriptions ?? []) as string[]
  )
  const [showAdd, setShowAdd] = useState(false)

  const transactionLabels = useMemo(
    () => (getVaultDataSync().transactionLabels ?? {}) as Record<string, string>,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const entries = useMemo(
    () => detectSubscriptions(statements, manualSubs, subscribedDescriptions, transactionLabels, dismissedSubscriptions),
    [statements, manualSubs, subscribedDescriptions, transactionLabels, dismissedSubscriptions]
  )

  const totalMonthly = entries.reduce((s, e) => s + e.monthlyAmount, 0)
  const totalAnnual  = totalMonthly * 12
  const hasApple     = entries.some(e => e.isApple)
  const hasGoPay     = manualSubs.some(m => (m.notes ?? '').toLowerCase().includes('gopay') || (m.notes ?? '').toLowerCase().includes('ovo'))

  async function handleAddManual(sub: ManualSubscription) {
    const updated = [...manualSubs, sub]
    setManualSubs(updated)
    setShowAdd(false)
    await saveVaultData({ manualSubscriptions: updated } as any)
  }

  async function handleDeleteManual(id: string) {
    const updated = manualSubs.filter(m => m.id !== id)
    setManualSubs(updated)
    await saveVaultData({ manualSubscriptions: updated } as any)
  }

  async function handleUnmark(normKey: string) {
    const updated = subscribedDescriptions.filter(k => k !== normKey)
    setSubscribedDescriptions(updated)
    await saveVaultData({ subscribedDescriptions: updated } as any)
  }

  async function handleDismiss(amtKey: string) {
    const updated = [...dismissedSubscriptions, amtKey]
    setDismissedSubscriptions(updated)
    await saveVaultData({ dismissedSubscriptions: updated } as any)
  }

  if (statements.length === 0) return null

  return (
    <>
      <div className="bg-white dark:bg-gray-900 dark:border dark:border-gray-800 rounded-2xl shadow-sm p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-1">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Subscriptions</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              Recurring digital services detected from your statements
            </p>
          </div>
          {totalMonthly > 0 && (
            <div className="text-right shrink-0 ml-2">
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatIDR(totalMonthly)}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">{formatIDRFull(totalAnnual)}/yr</p>
            </div>
          )}
        </div>

        {entries.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <svg className="w-9 h-9 text-gray-200 dark:text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
            </svg>
            <p className="text-sm text-gray-400 dark:text-gray-500">No subscriptions detected yet</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 max-w-xs">
              Services like Netflix, Spotify, and Canva are auto-detected when they appear in your statements.
              Add services paid via GoPay or OVO manually.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {entries.map(entry => (
              <SubscriptionRow
                key={entry.key}
                entry={entry}
                onDelete={
                  entry.source === 'manual'
                    ? () => handleDeleteManual(entry.key)
                    : entry.source === 'user' && entry.normKey
                    ? () => handleUnmark(entry.normKey!)
                    : entry.source === 'detected' && entry.normKey
                    ? () => handleDismiss(entry.normKey!)
                    : undefined
                }
                removeLabel={entry.source === 'detected' ? 'Dismiss' : 'Delete'}
                onGoToTransactions={onGoToTransactions}
              />
            ))}
          </div>
        )}

        {/* Summary footer */}
        {entries.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400 font-medium">Total per month</span>
            <div className="text-right">
              <span className="font-bold text-gray-900 dark:text-gray-100">{formatIDRFull(totalMonthly)}</span>
              <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">· {formatIDRFull(totalAnnual)}/yr</span>
            </div>
          </div>
        )}

        {/* Add manually button */}
        <button
          onClick={() => setShowAdd(true)}
          className="mt-4 w-full flex items-center justify-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium py-2 rounded-xl border border-dashed border-blue-200 dark:border-blue-800/60 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add subscription manually
        </button>

        {/* Limitation note */}
        {(hasApple || hasGoPay || entries.length > 0) && (
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-3 leading-relaxed">
            Catalog services (Netflix, Spotify, etc.) are detected by name.
            Other recurring charges are auto-detected when the same amount appears in 3+ consecutive months within the last 6 months.
            {hasApple && ' Apple charges flagged individually — use ↻ on any VAP-APPLE.COM row to track iCloud or Apple Music separately.'}
            {' '}Services paid via GoPay, OVO, or other wallets won&apos;t appear automatically — add them manually above.
          </p>
        )}
      </div>

      {showAdd && (
        <AddManualModal onClose={() => setShowAdd(false)} onSave={handleAddManual} />
      )}
    </>
  )
}
