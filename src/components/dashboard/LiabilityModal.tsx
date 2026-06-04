/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import { useState, useEffect } from 'react'
import { addLiability, updateLiability, type Liability, type LiabilityType } from '@/lib/liabilityStorage'
import { getAssets, type Asset } from '@/lib/assetStorage'

function formatThousands(n: number): string {
  return n ? new Intl.NumberFormat('id-ID').format(n) : ''
}

function parseIDR(s: string): number {
  return Number(s.replace(/[^0-9]/g, '')) || 0
}

const LIABILITY_TYPES: { id: LiabilityType; label: string; desc: string }[] = [
  { id: 'mortgage',       label: 'KPR',             desc: 'Property mortgage loan' },
  { id: 'vehicle_loan',   label: 'KKB',             desc: 'Vehicle installment loan' },
  { id: 'personal_loan',  label: 'KTA',             desc: 'Personal loan / kredit tanpa agunan' },
  { id: 'credit_card',    label: 'Credit Card',     desc: 'Credit card outstanding balance' },
  { id: 'other',          label: 'Other',           desc: 'Other debt or obligation' },
]

const LINKABLE_TYPES: Asset['type'][] = ['vehicle', 'property']

interface Props {
  isOpen: boolean
  liability: Liability | null
  onClose: () => void
  onSaved: () => void
}

export default function LiabilityModal({ isOpen, liability, onClose, onSaved }: Props) {
  const [type, setType]                   = useState<LiabilityType>('mortgage')
  const [name, setName]                   = useState('')
  const [institution, setInstitution]     = useState('')
  const [originalAmount, setOriginalAmount] = useState('')
  const [remainingBalance, setRemainingBalance] = useState('')
  const [monthlyInstallment, setMonthlyInstallment] = useState('')
  const [interestRate, setInterestRate]   = useState('')
  const [startDate, setStartDate]         = useState('')
  const [endDate, setEndDate]             = useState('')
  const [linkedAssetId, setLinkedAssetId] = useState('')
  const [notes, setNotes]                 = useState('')
  const [errors, setErrors]               = useState<Record<string, string>>({})
  const [saving, setSaving]               = useState(false)

  const assets = getAssets().filter(a => LINKABLE_TYPES.includes(a.type))

  useEffect(() => {
    if (liability) {
      setType(liability.type)
      setName(liability.name)
      setInstitution(liability.institution)
      setOriginalAmount(formatThousands(liability.originalAmount))
      setRemainingBalance(formatThousands(liability.remainingBalance))
      setMonthlyInstallment(liability.monthlyInstallment ? formatThousands(liability.monthlyInstallment) : '')
      setInterestRate(liability.interestRate != null ? String(liability.interestRate) : '')
      setStartDate(liability.startDate ?? '')
      setEndDate(liability.endDate ?? '')
      setLinkedAssetId(liability.linkedAssetId ?? '')
      setNotes(liability.notes ?? '')
    } else {
      setType('mortgage')
      setName('')
      setInstitution('')
      setOriginalAmount('')
      setRemainingBalance('')
      setMonthlyInstallment('')
      setInterestRate('')
      setStartDate('')
      setEndDate('')
      setLinkedAssetId('')
      setNotes('')
    }
    setErrors({})
  }, [liability, isOpen])

  if (!isOpen) return null

  const isCC = type === 'credit_card'

  function validate() {
    const e: Record<string, string> = {}
    if (!name.trim())       e.name = 'Name is required'
    if (!institution.trim()) e.institution = 'Institution is required'
    if (!parseIDR(originalAmount))
      e.originalAmount = isCC ? 'Enter credit limit' : 'Enter original loan amount'
    // For loans: balance can't exceed original. For CC: over-limit is possible — just warn, don't block.
    if (!isCC && parseIDR(remainingBalance) > parseIDR(originalAmount))
      e.remainingBalance = 'Cannot exceed original amount'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    const now = new Date().toISOString()
    const data = {
      type,
      name: name.trim(),
      institution: institution.trim(),
      originalAmount:     parseIDR(originalAmount),
      remainingBalance:   parseIDR(remainingBalance),
      monthlyInstallment: parseIDR(monthlyInstallment) || undefined,
      interestRate:       interestRate ? Number(interestRate) : undefined,
      startDate:          startDate || undefined,
      endDate:            endDate || undefined,
      linkedAssetId:      linkedAssetId || undefined,
      notes:              notes.trim() || undefined,
      updatedAt:          now,
    }
    if (liability) {
      await updateLiability(liability.id, data)
    } else {
      await addLiability(data)
    }
    onSaved()
    onClose()
    setSaving(false)
  }

  const limit       = parseIDR(originalAmount)
  const outstanding = parseIDR(remainingBalance)
  // Loans: % paid off. Credit cards: % of limit used (utilization).
  const paidOff      = limit > 0 ? Math.max(0, Math.min(100, ((limit - outstanding) / limit) * 100)) : 0
  const utilization  = limit > 0 ? Math.min(100, (outstanding / limit) * 100) : 0
  const utilizationColor = utilization >= 70 ? 'bg-red-400' : utilization >= 30 ? 'bg-amber-400' : 'bg-green-400'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 sticky top-0 bg-white dark:bg-gray-900 z-10">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {liability ? 'Edit Liability' : 'Add Liability'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="h-px bg-gray-100 dark:bg-gray-800" />

        <div className="px-6 py-5 space-y-4">

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type</label>
            <div className="grid grid-cols-2 gap-2">
              {LIABILITY_TYPES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setType(t.id)}
                  className={`px-3 py-2.5 rounded-xl border text-left transition ${
                    type === t.id
                      ? 'border-red-400 bg-red-50 dark:bg-red-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <p className={`text-sm font-semibold ${type === t.id ? 'text-red-700 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>{t.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5 leading-tight">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Name</label>
            <input
              type="text"
              autoFocus
              placeholder={
                type === 'mortgage'      ? 'KPR BCA – Rumah Depok' :
                type === 'vehicle_loan'  ? 'KKB Mandiri – Avanza 2022' :
                type === 'credit_card'   ? 'e.g. BCA Mastercard, Mandiri Signature' :
                'Nama pinjaman'
              }
              value={name}
              onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: '' })) }}
              className={`w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 ${errors.name ? 'border-red-300' : 'border-gray-200 dark:border-gray-700'}`}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          {/* Institution */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Institution</label>
            <input
              type="text"
              placeholder="e.g. Bank BCA, Bank Mandiri"
              value={institution}
              onChange={e => { setInstitution(e.target.value); setErrors(p => ({ ...p, institution: '' })) }}
              className={`w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 ${errors.institution ? 'border-red-300' : 'border-gray-200 dark:border-gray-700'}`}
            />
            {errors.institution && <p className="text-xs text-red-500 mt-1">{errors.institution}</p>}
          </div>

          {/* Credit limit / Original amount + Outstanding / Remaining balance */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {isCC ? 'Credit Limit' : 'Original Amount'}
              </label>
              <div className={`flex items-center border rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-red-400 ${errors.originalAmount ? 'border-red-300' : 'border-gray-200 dark:border-gray-700'}`}>
                <span className="px-2 py-2.5 text-xs text-gray-400 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 select-none">Rp</span>
                <input
                  type="text" inputMode="numeric" placeholder="0"
                  value={originalAmount}
                  onChange={e => {
                    const d = e.target.value.replace(/[^0-9]/g, '')
                    setOriginalAmount(d ? formatThousands(Number(d)) : '')
                    setErrors(p => ({ ...p, originalAmount: '' }))
                  }}
                  className="flex-1 px-2 py-2.5 text-sm focus:outline-none bg-transparent min-w-0 text-gray-900 dark:text-gray-100"
                />
              </div>
              {errors.originalAmount && <p className="text-xs text-red-500 mt-1">{errors.originalAmount}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {isCC ? 'Outstanding Balance' : 'Remaining Balance'}
              </label>
              <div className={`flex items-center border rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-red-400 ${errors.remainingBalance ? 'border-red-300' : 'border-gray-200 dark:border-gray-700'}`}>
                <span className="px-2 py-2.5 text-xs text-gray-400 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 select-none">Rp</span>
                <input
                  type="text" inputMode="numeric" placeholder="0"
                  value={remainingBalance}
                  onChange={e => {
                    const d = e.target.value.replace(/[^0-9]/g, '')
                    setRemainingBalance(d ? formatThousands(Number(d)) : '')
                    setErrors(p => ({ ...p, remainingBalance: '' }))
                  }}
                  className="flex-1 px-2 py-2.5 text-sm focus:outline-none bg-transparent min-w-0 text-gray-900 dark:text-gray-100"
                />
              </div>
              {errors.remainingBalance && <p className="text-xs text-red-500 mt-1">{errors.remainingBalance}</p>}
              {isCC && outstanding > limit && limit > 0 && (
                <p className="text-xs text-amber-500 mt-1">Over credit limit</p>
              )}
            </div>
          </div>

          {/* Progress preview */}
          {limit > 0 && (
            <div>
              {isCC ? (
                <>
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span className={utilization >= 70 ? 'text-red-500' : utilization >= 30 ? 'text-amber-500' : 'text-green-600'}>
                      {utilization.toFixed(1)}% utilized
                    </span>
                    <span>limit {formatThousands(limit)}</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${utilizationColor}`} style={{ width: `${utilization}%` }} />
                  </div>
                  {utilization >= 70 && <p className="text-xs text-red-500 mt-1">High utilization may affect your credit score.</p>}
                </>
              ) : (
                <>
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>{paidOff.toFixed(1)}% paid off</span>
                    <span>{(100 - paidOff).toFixed(1)}% remaining</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-green-400 rounded-full transition-all" style={{ width: `${paidOff}%` }} />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Minimum payment / installment + interest rate */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {isCC ? 'Minimum Payment' : 'Monthly Installment'}
              </label>
              <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-red-400">
                <span className="px-2 py-2.5 text-xs text-gray-400 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 select-none">Rp</span>
                <input
                  type="text" inputMode="numeric" placeholder="optional"
                  value={monthlyInstallment}
                  onChange={e => {
                    const d = e.target.value.replace(/[^0-9]/g, '')
                    setMonthlyInstallment(d ? formatThousands(Number(d)) : '')
                  }}
                  className="flex-1 px-2 py-2.5 text-sm focus:outline-none bg-transparent min-w-0 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {isCC ? 'Interest Rate (% / month)' : 'Interest Rate (% p.a.)'}
              </label>
              <input
                type="number" step="0.01" min="0"
                placeholder={isCC ? 'e.g. 1.75' : 'optional'}
                value={interestRate}
                onChange={e => setInterestRate(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
              {isCC && <p className="text-xs text-gray-400 mt-1">OJK cap: 1.75%/month</p>}
            </div>
          </div>

          {/* Dates — loans: start + maturity; CC: expiry only */}
          {isCC ? (
            <div className="w-1/2 pr-1.5">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Card Expiry <span className="font-normal text-gray-400">(optional)</span></label>
              <input
                type="month" value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Start Date</label>
                <input
                  type="month" value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">End / Maturity</label>
                <input
                  type="month" value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
          )}

          {/* Link to asset — not applicable for credit cards */}
          {assets.length > 0 && !isCC && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Linked Asset <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <select
                value={linkedAssetId}
                onChange={e => setLinkedAssetId(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="">— none —</option>
                {assets.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.type})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">Links this loan to a vehicle or property asset to show equity.</p>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Notes <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="e.g. refinanced in 2024, interest-only period ends June 2025"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2.5 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-semibold transition"
          >
            {saving ? 'Saving…' : liability ? 'Save Changes' : 'Add Liability'}
          </button>
        </div>
      </div>
    </div>
  )
}
