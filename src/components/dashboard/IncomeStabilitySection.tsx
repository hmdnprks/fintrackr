'use client'

interface Props {
  savingsRateTrend: { income: number; expense: number; rate: number }[]
}

function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0
  const mean = arr.reduce((s, v) => s + v, 0) / arr.length
  return Math.sqrt(arr.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / arr.length)
}

function formatIDR(n: number): string {
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}jt`
  if (n >= 1_000)     return `Rp ${Math.round(n / 1_000)}rb`
  return `Rp ${Math.round(n).toLocaleString('id-ID')}`
}

export default function IncomeStabilitySection({ savingsRateTrend }: Props) {
  const incomes = savingsRateTrend.slice(-6).map(d => d.income).filter(v => v > 0)
  if (incomes.length < 3) return null

  const mean = incomes.reduce((s, v) => s + v, 0) / incomes.length
  const cv   = stdDev(incomes) / mean   // coefficient of variation

  const tier =
    cv < 0.15 ? 'stable' :
    cv < 0.40 ? 'variable' : 'volatile'

  const META = {
    stable: {
      label:  'Stable',
      color:  'text-green-600 dark:text-green-400',
      bg:     'bg-green-50 dark:bg-green-900/20',
      bar:    'bg-green-500',
      barPct: Math.min(100, Math.round((1 - cv) * 100)),
      desc:   'Your income is very consistent month to month — less than 15% variation across recent months.',
      efNote: 'Standard 3–6 month emergency fund is appropriate for your income stability.',
      efColor: 'text-green-600 dark:text-green-400',
    },
    variable: {
      label:  'Variable',
      color:  'text-amber-600 dark:text-amber-400',
      bg:     'bg-amber-50 dark:bg-amber-900/20',
      bar:    'bg-amber-400',
      barPct: Math.min(100, Math.round((1 - cv / 0.8) * 100)),
      desc:   'Your income varies moderately (15–40%) — could be seasonal bonuses, overtime, or mixed income sources.',
      efNote: 'Consider keeping 6–9 months emergency fund to cover lower-income months comfortably.',
      efColor: 'text-amber-600 dark:text-amber-400',
    },
    volatile: {
      label:  'Highly Variable',
      color:  'text-red-500 dark:text-red-400',
      bg:     'bg-red-50 dark:bg-red-900/20',
      bar:    'bg-red-400',
      barPct: Math.min(30, Math.round((1 - cv) * 100)),
      desc:   'Your income fluctuates significantly (>40%) — common with freelance work, commissions, or irregular employment.',
      efNote: '9+ months emergency fund recommended. High income unpredictability means longer gaps between paydays are possible.',
      efColor: 'text-red-500 dark:text-red-400',
    },
  }

  const m = META[tier]
  const min = Math.min(...incomes)
  const max = Math.max(...incomes)

  return (
    <div className="bg-white dark:bg-gray-900 dark:border dark:border-gray-800 p-6 rounded-2xl shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Income Stability</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            Variance across last {incomes.length} months of income
          </p>
        </div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${m.color} ${m.bg}`}>
          {m.label}
        </span>
      </div>

      {/* Range bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mb-1.5">
          <span>Low {formatIDR(min)}</span>
          <span className="font-medium text-gray-700 dark:text-gray-300">Avg {formatIDR(mean)}</span>
          <span>High {formatIDR(max)}</span>
        </div>
        <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${m.bar}`} style={{ width: `${m.barPct}%` }} />
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 text-right">
          Variation: {Math.round(cv * 100)}%
        </p>
      </div>

      {/* Description */}
      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3">
        {m.desc}
      </p>

      {/* Emergency fund implication */}
      <div className={`flex items-start gap-2 rounded-xl px-3 py-2.5 ${m.bg}`}>
        <svg className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${m.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        <p className={`text-xs leading-relaxed ${m.efColor}`}>
          <span className="font-semibold">Emergency fund implication: </span>{m.efNote}
        </p>
      </div>
    </div>
  )
}
