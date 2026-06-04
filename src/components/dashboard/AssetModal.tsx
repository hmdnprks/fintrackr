'use client'

import { useState, useEffect } from 'react'
import { Asset, AssetType, PhysicalSubtype, NewAsset, saveAsset, updateAsset } from '@/lib/assetStorage'
import { BanknotesIcon, StarIcon, ArrowTrendingUpIcon, WalletIcon, ArchiveBoxIcon, TruckIcon, HomeModernIcon, ArrowPathIcon } from '@heroicons/react/24/outline'

interface Props {
  isOpen: boolean
  asset?: Asset | null   // null = add mode, Asset = edit mode
  onClose: () => void
  onSaved: () => void
}

type IconComponent = React.ComponentType<{ className?: string }>

const TYPE_OPTIONS: { id: AssetType; label: string; Icon: IconComponent }[] = [
  { id: 'savings',    label: 'Savings',    Icon: BanknotesIcon      },
  { id: 'gold',       label: 'Gold',       Icon: StarIcon           },
  { id: 'investment', label: 'Investment', Icon: ArrowTrendingUpIcon},
  { id: 'pocket',     label: 'Pocket',     Icon: WalletIcon         },
  { id: 'vehicle',    label: 'Vehicle',    Icon: TruckIcon          },
  { id: 'property',   label: 'Property',   Icon: HomeModernIcon     },
  { id: 'other',      label: 'Other',      Icon: ArchiveBoxIcon     },
]

const VEHICLE_SUBTYPES: { id: PhysicalSubtype; label: string }[] = [
  { id: 'car',        label: 'Car'        },
  { id: 'motorcycle', label: 'Motorcycle' },
  { id: 'other',      label: 'Other'      },
]

const PROPERTY_SUBTYPES: { id: PhysicalSubtype; label: string }[] = [
  { id: 'house',     label: 'House'     },
  { id: 'apartment', label: 'Apartment' },
  { id: 'land',      label: 'Land'      },
  { id: 'other',     label: 'Other'     },
]

const DEFAULT_RATES: Record<PhysicalSubtype, number> = {
  car: -10, motorcycle: -15, house: 3, apartment: 2, land: 5, other: 0,
}

function computeEst(price: number, year: number, rate: number): number {
  const years = new Date().getFullYear() - year
  if (years <= 0) return price
  return Math.max(0, price * Math.pow(1 + rate / 100, years))
}

const CURRENCIES = ['USD', 'EUR', 'SGD', 'GBP', 'AUD', 'JPY', 'MYR', 'CNY', 'SAR', 'HKD']

async function fetchRate(from: string): Promise<number> {
  const res = await fetch(`https://api.frankfurter.app/latest?from=${from}&to=IDR`)
  if (!res.ok) throw new Error('Rate fetch failed')
  const data = await res.json()
  return data.rates?.IDR as number
}

function formatThousands(n: number): string {
  if (!n) return ''
  return new Intl.NumberFormat('id-ID').format(n)
}

function parseIDR(s: string): number {
  return Number(s.replace(/[^0-9]/g, ''))
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

function monthOptions() {
  const now = new Date()
  const options: { label: string; value: string }[] = []
  for (let y = now.getFullYear(); y <= now.getFullYear() + 5; y++) {
    for (let m = 1; m <= 12; m++) {
      if (y === now.getFullYear() && m < now.getMonth() + 1) continue
      const value = `${y}-${String(m).padStart(2, '0')}`
      options.push({ label: `${MONTHS[m - 1]} ${y}`, value })
    }
  }
  return options
}

export default function AssetModal({ isOpen, asset, onClose, onSaved }: Props) {
  const editing = !!asset

  const [type, setType]               = useState<AssetType>('savings')
  const [name, setName]               = useState('')
  const [institution, setInstitution] = useState('')
  const [value, setValue]             = useState('')
  const [interestRate, setInterestRate] = useState('')
  const [isEmergencyFund, setIsEmergencyFund] = useState(false)
  const [goldGrams, setGoldGrams]     = useState('')
  const [platform, setPlatform]           = useState('')
  const [contributable, setContributable] = useState(true)
  const [goalName, setGoalName]       = useState('')
  const [goalTarget, setGoalTarget]   = useState('')
  const [goalDeadline, setGoalDeadline] = useState('')
  const [notes, setNotes]             = useState('')
  const [physicalSubtype, setPhysicalSubtype] = useState<PhysicalSubtype>('car')
  const [purchasePrice, setPurchasePrice]     = useState('')
  const [purchaseYear, setPurchaseYear]       = useState('')
  const [annualChangeRate, setAnnualChangeRate] = useState('')
  const [currency, setCurrency]               = useState('IDR')
  const [foreignAmount, setForeignAmount]     = useState('')
  const [exchangeRate, setExchangeRate]       = useState('')
  const [fetchingRate, setFetchingRate]       = useState(false)
  const [rateError, setRateError]             = useState('')
  const [rateCache, setRateCache]             = useState<Record<string, number>>({})
  const [isManualValue, setIsManualValue] = useState(false)
  const [errors, setErrors]           = useState<Record<string, string>>({})
  const [saving, setSaving]           = useState(false)

  // Populate form when editing
  useEffect(() => {
    if (asset) {
      setType(asset.type)
      setName(asset.name)
      setInstitution(asset.institution)
      setValue(formatThousands(asset.currentValue))
      setInterestRate(asset.interestRate != null ? String(asset.interestRate) : '')
      setIsEmergencyFund(asset.isEmergencyFund ?? false)
      setGoldGrams(asset.goldGrams != null ? String(asset.goldGrams) : '')
      setPlatform(asset.platform ?? '')
      setContributable(asset.contributable ?? true)
      setGoalName(asset.goalName ?? '')
      setGoalTarget(asset.goalTarget != null ? formatThousands(asset.goalTarget) : '')
      setGoalDeadline(asset.goalDeadline ?? '')
      setNotes(asset.notes ?? '')
      setPhysicalSubtype(asset.physicalSubtype ?? 'car')
      setPurchasePrice(asset.purchasePrice != null ? formatThousands(asset.purchasePrice) : '')
      setPurchaseYear(asset.purchaseYear != null ? String(asset.purchaseYear) : '')
      setAnnualChangeRate(asset.annualChangeRate != null ? String(asset.annualChangeRate) : '')
      setCurrency(asset.currency ?? 'IDR')
      setForeignAmount(asset.foreignAmount != null ? String(asset.foreignAmount) : '')
      setExchangeRate(asset.exchangeRate != null ? String(asset.exchangeRate) : '')
      if (asset.currency && asset.currency !== 'IDR' && asset.exchangeRate) {
        setRateCache({ [asset.currency]: asset.exchangeRate })
      }
    } else {
      setType('savings')
      setName('')
      setInstitution('')
      setValue('')
      setInterestRate('')
      setIsEmergencyFund(false)
      setGoldGrams('')
      setPlatform('')
      setContributable(true)
      setGoalName('')
      setGoalTarget('')
      setGoalDeadline('')
      setNotes('')
      setPhysicalSubtype('car')
      setPurchasePrice('')
      setPurchaseYear('')
      setAnnualChangeRate('')
      setCurrency('IDR')
      setForeignAmount('')
      setExchangeRate('')
    }
    setIsManualValue(!!asset) // editing existing = treat stored value as manual
    setRateError('')
    setErrors({})
    if (!asset) setRateCache({})
  }, [asset, isOpen])

  async function doFetchRate(targetCurrency: string, fa?: string) {
    setFetchingRate(true)
    setRateError('')
    try {
      const rate = await fetchRate(targetCurrency)
      setRateCache(prev => ({ ...prev, [targetCurrency]: rate }))
      setExchangeRate(String(rate))
      const amount = Number(fa ?? foreignAmount)
      if (amount > 0) setValue(formatThousands(Math.round(amount * rate)))
    } catch {
      setRateError('Could not fetch rate. Check your connection and try again.')
    } finally {
      setFetchingRate(false)
    }
  }

  function handleCurrencyChange(next: string) {
    if (next === currency) return
    setCurrency(next)
    setRateError('')
    if (next === 'IDR') {
      setExchangeRate('')
      if (foreignAmount && exchangeRate) setValue('')
      return
    }
    const cached = rateCache[next]
    if (cached) {
      // Restore from cache instantly — no API call needed
      setExchangeRate(String(cached))
      const fa = Number(foreignAmount)
      if (fa > 0) setValue(formatThousands(Math.round(fa * cached)))
    } else {
      // Nothing cached — clear stale rate and auto-fetch for the new currency
      setExchangeRate('')
      if (foreignAmount && exchangeRate) setValue('')
      doFetchRate(next, foreignAmount)
    }
  }

  function handleRefreshRate() {
    if (currency === 'IDR') return
    doFetchRate(currency)
  }

  const CURRENCY_TYPES: AssetType[] = ['savings', 'gold', 'investment']

  // When switching to vehicle/property with no rate set, apply the default for the subtype
  useEffect(() => {
    if ((type === 'vehicle' || type === 'property') && annualChangeRate === '') {
      setAnnualChangeRate(String(DEFAULT_RATES[physicalSubtype]))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, physicalSubtype])

  // Reset currency when switching to a type that doesn't support it
  useEffect(() => {
    if (!CURRENCY_TYPES.includes(type) && currency !== 'IDR') {
      setCurrency('IDR')
      setForeignAmount('')
      setExchangeRate('')
      setRateError('')
      setValue('')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type])

  // Auto-fill current value from depreciation model for vehicle/property (new assets only)
  useEffect(() => {
    if (isManualValue) return
    if (type !== 'vehicle' && type !== 'property') return
    const price = parseIDR(purchasePrice)
    const year  = Number(purchaseYear)
    const rate  = Number(annualChangeRate)
    if (price > 0 && year > 0 && annualChangeRate !== '') {
      setValue(formatThousands(Math.round(computeEst(price, year, rate))))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchasePrice, purchaseYear, annualChangeRate, type, isManualValue])

  if (!isOpen) return null

  function validate() {
    const e: Record<string, string> = {}
    if (!name.trim())        e.name        = 'Name is required'
    if (!institution.trim()) e.institution = 'Institution is required'
    if (!parseIDR(value))    e.value       = 'Enter a valid amount'
    if (type === 'pocket' && goalTarget && !parseIDR(goalTarget))
      e.goalTarget = 'Enter a valid target amount'
    return e
  }

  async function handleSubmit() {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setSaving(true)

    const now = new Date().toISOString()
    const payload: NewAsset = {
      type,
      name: name.trim(),
      institution: institution.trim(),
      currentValue: parseIDR(value),
      updatedAt: now,
      ...(type === 'savings' && {
        interestRate: interestRate ? Number(interestRate) : undefined,
        isEmergencyFund,
      }),
      ...(type === 'gold' && {
        goldGrams: goldGrams ? Number(goldGrams) : undefined,
      }),
      ...(type === 'investment' && {
        platform: platform.trim() || undefined,
        contributable,
      }),
      ...(type === 'pocket' && {
        goalName: goalName.trim() || undefined,
        goalTarget: goalTarget ? parseIDR(goalTarget) : undefined,
        goalDeadline: goalDeadline || undefined,
        interestRate: interestRate ? Number(interestRate) : undefined,
      }),
      ...((type === 'vehicle' || type === 'property') && {
        physicalSubtype,
        purchasePrice: purchasePrice ? parseIDR(purchasePrice) : undefined,
        purchaseYear: purchaseYear ? Number(purchaseYear) : undefined,
        annualChangeRate: annualChangeRate !== '' ? Number(annualChangeRate) : undefined,
      }),
      ...(currency !== 'IDR' && {
        currency,
        foreignAmount: foreignAmount ? Number(foreignAmount) : undefined,
        exchangeRate: exchangeRate ? Number(exchangeRate) : undefined,
        exchangeRateUpdatedAt: exchangeRate ? new Date().toISOString() : undefined,
      }),
      notes: notes.trim() || undefined,
    }

    try {
      if (editing && asset) {
        await updateAsset(asset.id, payload)
      } else {
        await saveAsset(payload)
      }
      onSaved()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const deadlineOptions = monthOptions()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md z-10 max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 z-10">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {editing ? 'Edit Asset' : 'Add Asset'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* Type selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Asset Type</label>
            <div className="flex gap-2 flex-wrap">
              {TYPE_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setType(opt.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                    type === opt.id
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <span className="flex items-center gap-1.5"><opt.Icon className="w-4 h-4" />{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {type === 'pocket' ? 'Pocket Name' : 'Asset Name'}
            </label>
            <input
              type="text"
              placeholder={
                type === 'savings'    ? 'e.g. BCA Tahapan'         :
                type === 'gold'       ? 'e.g. Antam Gold'          :
                type === 'investment' ? 'e.g. Reksa Dana Campuran' :
                type === 'pocket'     ? 'e.g. Travel Japan'        :
                type === 'vehicle'    ? 'e.g. Honda Civic 2021'    :
                type === 'property'   ? 'e.g. Rumah Depok'         :
                'e.g. Emergency Cash'
              }
              value={name}
              onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: '' })) }}
              className={`w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 ${
                errors.name ? 'border-red-300 bg-red-50 dark:bg-red-900/20' : 'border-gray-200 dark:border-gray-700'
              }`}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          {/* Institution */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Institution / Platform</label>
            <input
              type="text"
              placeholder={
                type === 'investment' ? 'e.g. Bibit, Stockbit'   :
                type === 'gold'       ? 'e.g. Antam, Pegadaian'  :
                type === 'vehicle'    ? 'e.g. Toyota, Honda'     :
                type === 'property'   ? 'e.g. Perumahan, Mandiri' :
                'e.g. BCA, Bank Jago'
              }
              value={institution}
              onChange={e => { setInstitution(e.target.value); setErrors(p => ({ ...p, institution: '' })) }}
              className={`w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 ${
                errors.institution ? 'border-red-300 bg-red-50 dark:bg-red-900/20' : 'border-gray-200 dark:border-gray-700'
              }`}
            />
            {errors.institution && <p className="text-xs text-red-500 mt-1">{errors.institution}</p>}
          </div>

          {/* Current Value — hidden here for vehicle/property; rendered inside that section instead */}
          {type !== 'vehicle' && type !== 'property' && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {currency !== 'IDR' ? 'IDR Equivalent' : 'Current Value'}
                {currency !== 'IDR' && (
                  <span className="ml-1.5 text-xs font-normal text-gray-400">auto-computed from {currency} amount × rate</span>
                )}
              </label>
            </div>
            <div className={`flex items-center border rounded-xl overflow-hidden ${
              currency !== 'IDR'
                ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-75'
                : `focus-within:ring-2 focus-within:ring-blue-500 ${errors.value ? 'border-red-300 bg-red-50 dark:bg-red-900/20' : 'border-gray-200 dark:border-gray-700'}`
            }`}>
              <span className="px-3 py-2.5 text-sm text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 select-none">Rp</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                readOnly={currency !== 'IDR'}
                value={value}
                onChange={e => {
                  if (currency !== 'IDR') return
                  const digits = e.target.value.replace(/[^0-9]/g, '')
                  setValue(digits ? formatThousands(Number(digits)) : '')
                  setErrors(p => ({ ...p, value: '' }))
                }}
                className={`flex-1 px-3 py-2.5 text-sm focus:outline-none bg-transparent min-w-0 text-gray-900 dark:text-gray-100 ${currency !== 'IDR' ? 'cursor-default select-none' : ''}`}
              />
            </div>
            {currency !== 'IDR' && !value && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Enter the {currency} amount and exchange rate above to compute</p>
            )}
            {errors.value && currency === 'IDR' && <p className="text-xs text-red-500 mt-1">{errors.value}</p>}
          </div>
          )}

          {/* Savings-specific fields */}
          {type === 'savings' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Interest Rate (% p.a.)</label>
                  <input
                    type="number"
                    min="0" max="20" step="0.1"
                    placeholder="e.g. 6"
                    value={interestRate}
                    onChange={e => setInterestRate(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex flex-col justify-end pb-0.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <div
                      onClick={() => setIsEmergencyFund(v => !v)}
                      className={`w-10 h-5 rounded-full transition-colors relative ${
                        isEmergencyFund ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                        isEmergencyFund ? 'translate-x-5' : 'translate-x-0.5'
                      }`} />
                    </div>
                    <span className="text-sm text-gray-700 dark:text-gray-300">Emergency fund</span>
                  </label>
                </div>
              </div>
            </>
          )}

          {/* Gold-specific */}
          {type === 'gold' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Weight (grams, optional)</label>
              <input
                type="number"
                min="0" step="0.01"
                placeholder="e.g. 10"
                value={goldGrams}
                onChange={e => setGoldGrams(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Investment-specific */}
          {type === 'investment' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Investment Type</label>
                <input
                  type="text"
                  placeholder="e.g. Reksa Dana Saham, Obligasi"
                  value={platform}
                  onChange={e => setPlatform(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <div
                  onClick={() => setContributable(v => !v)}
                  className={`w-10 h-5 rounded-full transition-colors relative shrink-0 mt-0.5 ${
                    contributable ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    contributable ? 'translate-x-5' : 'translate-x-0.5'
                  }`} />
                </div>
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">I can manually add funds</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    Turn off for auto-managed assets like BPJS Ketenagakerjaan JHT — the windfall allocator will skip them.
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* Pocket-specific */}
          {type === 'pocket' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Goal</label>
                <input
                  type="text"
                  placeholder="e.g. Trip to Japan"
                  value={goalName}
                  onChange={e => setGoalName(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Interest Rate (% p.a.) <span className="text-gray-400 dark:text-gray-500 font-normal">— optional</span>
                </label>
                <input
                  type="number"
                  min="0" max="20" step="0.1"
                  placeholder="e.g. 4.5"
                  value={interestRate}
                  onChange={e => setInterestRate(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Target Amount</label>
                  <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
                    <span className="px-2 py-2.5 text-sm text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 select-none">Rp</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={goalTarget}
                      onChange={e => {
                        const digits = e.target.value.replace(/[^0-9]/g, '')
                        setGoalTarget(digits ? formatThousands(Number(digits)) : '')
                        setErrors(p => ({ ...p, goalTarget: '' }))
                      }}
                      className="flex-1 px-2 py-2.5 text-sm focus:outline-none bg-transparent min-w-0 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  {errors.goalTarget && <p className="text-xs text-red-500 mt-1">{errors.goalTarget}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Deadline</label>
                  <select
                    value={goalDeadline}
                    onChange={e => setGoalDeadline(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">No deadline</option>
                    {deadlineOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Vehicle / Property fields */}
          {(type === 'vehicle' || type === 'property') && (() => {
            const subtypes = type === 'vehicle' ? VEHICLE_SUBTYPES : PROPERTY_SUBTYPES
            const estPrice = parseIDR(purchasePrice)
            const estYear  = Number(purchaseYear)
            const estRate  = Number(annualChangeRate)
            const showEst  = estPrice > 0 && estYear > 0 && annualChangeRate !== ''
            const estValue = showEst ? computeEst(estPrice, estYear, estRate) : null

            return (
              <div className="space-y-3">
                {/* Subtype */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    {type === 'vehicle' ? 'Vehicle Type' : 'Property Type'}
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {subtypes.map(s => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setPhysicalSubtype(s.id)
                          if (annualChangeRate === '' || annualChangeRate === String(DEFAULT_RATES[physicalSubtype])) {
                            setAnnualChangeRate(String(DEFAULT_RATES[s.id]))
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                          physicalSubtype === s.id
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Purchase price + year */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Purchase Price</label>
                    <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
                      <span className="px-2 py-2.5 text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 select-none">Rp</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={purchasePrice}
                        onChange={e => {
                          const d = e.target.value.replace(/[^0-9]/g, '')
                          setPurchasePrice(d ? formatThousands(Number(d)) : '')
                        }}
                        className="flex-1 px-2 py-2.5 text-sm focus:outline-none bg-transparent min-w-0 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Purchase Year</label>
                    <input
                      type="number"
                      min="1980" max={new Date().getFullYear()}
                      placeholder={String(new Date().getFullYear())}
                      value={purchaseYear}
                      onChange={e => setPurchaseYear(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Annual change rate */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Annual Change Rate (%)
                    <span className="ml-1.5 text-xs font-normal text-gray-400">negative = depreciates · positive = appreciates</span>
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="e.g. -10 for car, +5 for land"
                    value={annualChangeRate}
                    onChange={e => setAnnualChangeRate(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Current Value — placed here for vehicle/property, below purchase fields */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Current Value
                      {!isManualValue && (
                        <span className="ml-1.5 text-xs font-normal text-blue-500 dark:text-blue-400">auto-estimated</span>
                      )}
                    </label>
                    {isManualValue && estValue !== null && (
                      <button
                        onClick={() => { setValue(formatThousands(Math.round(estValue))); setIsManualValue(false) }}
                        className="text-xs text-blue-500 dark:text-blue-400 hover:underline"
                      >
                        Reset to estimate ({new Intl.NumberFormat('id-ID').format(Math.round(estValue))})
                      </button>
                    )}
                  </div>
                  <div className={`flex items-center border rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 ${
                    errors.value ? 'border-red-300 bg-red-50 dark:bg-red-900/20' : 'border-gray-200 dark:border-gray-700'
                  }`}>
                    <span className="px-3 py-2.5 text-sm text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 select-none">Rp</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={value}
                      onChange={e => {
                        const digits = e.target.value.replace(/[^0-9]/g, '')
                        setValue(digits ? formatThousands(Number(digits)) : '')
                        setErrors(p => ({ ...p, value: '' }))
                        setIsManualValue(true)
                      }}
                      className="flex-1 px-3 py-2.5 text-sm focus:outline-none bg-transparent min-w-0 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  {errors.value && <p className="text-xs text-red-500 mt-1">{errors.value}</p>}
                </div>

                <p className="text-xs text-gray-400 dark:text-gray-500 bg-amber-50 dark:bg-amber-900/20 rounded-xl px-3 py-2">
                  Vehicle and property values are excluded from emergency fund and liquid coverage calculations — they are illiquid assets.
                </p>
              </div>
            )
          })()}

          {/* Currency — only for savings, gold, investment */}
          {CURRENCY_TYPES.includes(type) && <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Currency</label>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => handleCurrencyChange('IDR')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                    currency === 'IDR'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  IDR (default)
                </button>
                {CURRENCIES.map(c => (
                  <button
                    key={c}
                    onClick={() => handleCurrencyChange(c)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                      currency === c
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {currency !== 'IDR' && (
              <div className="space-y-3">
                {/* Foreign amount + rate side by side */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Amount ({currency})
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="e.g. 1000"
                      value={foreignAmount}
                      onChange={e => {
                        setForeignAmount(e.target.value)
                        const fa = Number(e.target.value)
                        const rate = Number(exchangeRate)
                        if (fa > 0 && rate > 0) setValue(formatThousands(Math.round(fa * rate)))
                      }}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Rate (IDR/1 {currency})
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="e.g. 16200"
                      value={exchangeRate}
                      onChange={e => {
                        setExchangeRate(e.target.value)
                        const rate = Number(e.target.value)
                        const fa = Number(foreignAmount)
                        if (fa > 0 && rate > 0) setValue(formatThousands(Math.round(fa * rate)))
                      }}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Refresh rate button */}
                <button
                  onClick={handleRefreshRate}
                  disabled={fetchingRate}
                  className="flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 disabled:opacity-50 px-3 py-2 rounded-xl transition"
                >
                  <ArrowPathIcon className={`w-3.5 h-3.5 ${fetchingRate ? 'animate-spin' : ''}`} />
                  {fetchingRate ? `Fetching ${currency}/IDR rate…` : `Fetch latest ${currency}/IDR rate`}
                </button>
                {rateError && <p className="text-xs text-red-500">{rateError}</p>}

                {/* IDR equivalent preview */}
                {Number(foreignAmount) > 0 && Number(exchangeRate) > 0 && (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 text-xs">
                    <span className="text-gray-500 dark:text-gray-400">{foreignAmount} {currency} × Rp {Number(exchangeRate).toLocaleString('id-ID')} = </span>
                    <span className="font-bold text-gray-900 dark:text-gray-100">
                      Rp {Math.round(Number(foreignAmount) * Number(exchangeRate)).toLocaleString('id-ID')}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Notes (optional)</label>
            <input
              type="text"
              placeholder="Any extra context"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Asset'}
          </button>
        </div>

      </div>
    </div>
  )
}
