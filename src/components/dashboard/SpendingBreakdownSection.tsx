'use client'

interface Props {
  data: {
    income: number
    needs: number
    wants: number
    surplus: number
  }
}

function formatIDR(n: number) {
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}jt`
  if (n >= 1_000)     return `Rp ${Math.round(n / 1_000)}rb`
  return `Rp ${Math.round(n).toLocaleString('id-ID')}`
}

const ROWS = [
  {
    key: 'needs' as const,
    label: 'Needs',
    desc: 'Housing · Groceries · Transport · Health · Insurance · Services · Education',
    ideal: 50,
    color: 'bg-blue-500',
    overColor: 'bg-red-400',
    idealLabel: '≤50%',
    overMsg: (pct: number) => `${pct - 50}% over — look for ways to reduce fixed costs`,
    underMsg: (pct: number) => `${50 - pct}% under ideal — good cost control on essentials`,
    onMsg:    (_pct: number) => `Right on target for essential spending`,
  },
  {
    key: 'wants' as const,
    label: 'Wants',
    desc: 'Food & Dining · Shopping · Entertainment · Bank Charges · Uncategorized',
    ideal: 30,
    color: 'bg-purple-500',
    overColor: 'bg-red-400',
    idealLabel: '≤30%',
    overMsg: (pct: number) => `${pct - 30}% over — discretionary spending is high`,
    underMsg: (pct: number) => `${30 - pct}% under — good discretionary discipline`,
    onMsg:    (_pct: number) => `Discretionary spending within range`,
  },
  {
    key: 'surplus' as const,
    label: 'Surplus',
    desc: 'Income remaining after needs and wants — available for savings and investments',
    ideal: 20,
    color: 'bg-green-500',
    overColor: 'bg-green-400',
    idealLabel: '≥20%',
    overMsg: (pct: number) => `${pct}% surplus — excellent, put it to work in investments`,
    underMsg: (pct: number) => `Only ${pct}% surplus — below the 20% savings target`,
    onMsg:    (pct: number) => `${pct}% surplus — meets the 20% savings benchmark`,
  },
]

export default function SpendingBreakdownSection({ data }: Props) {
  if (!data.income || data.income <= 0) return null

  const pct = {
    needs:   Math.round((data.needs   / data.income) * 100),
    wants:   Math.round((data.wants   / data.income) * 100),
    surplus: Math.round((data.surplus / data.income) * 100),
  }

  // Guard: if the three don't add up cleanly (rounding), adjust surplus display
  const totalAccountedPct = pct.needs + pct.wants

  return (
    <div className="bg-white dark:bg-gray-900 dark:border dark:border-gray-800 p-6 rounded-2xl shadow-sm">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">50/30/20 Breakdown</h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
          How your income splits across needs, wants, and surplus — ideal: 50% needs · 30% wants · 20% savings
        </p>
      </div>

      <div className="space-y-5">
        {ROWS.map(row => {
          const actual = pct[row.key]
          const barPct = Math.min(100, actual)
          const isOver  = row.key !== 'surplus' ? actual > row.ideal : false
          const isUnder = row.key === 'surplus'  ? actual < row.ideal : actual < row.ideal
          const barColor = isOver ? row.overColor : row.color
          const amount = data[row.key]

          let statusMsg = ''
          if (row.key === 'surplus') {
            statusMsg = actual >= row.ideal ? row.overMsg(actual) : row.underMsg(actual)
          } else {
            statusMsg = isOver   ? row.overMsg(actual)
                      : isUnder  ? row.underMsg(actual)
                      : row.onMsg(actual)
          }

          return (
            <div key={row.key}>
              {/* Header row */}
              <div className="flex items-baseline justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{row.label}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                    row.key === 'surplus'
                      ? actual >= row.ideal ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                      : isOver ? 'bg-red-50 text-red-600' : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                  }`}>
                    {row.idealLabel}
                  </span>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-bold ${
                    row.key === 'surplus'
                      ? actual >= row.ideal ? 'text-green-600' : 'text-amber-600'
                      : isOver ? 'text-red-500' : 'text-gray-800 dark:text-gray-200'
                  }`}>{actual}%</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500 ml-1.5">{formatIDR(amount)}</span>
                </div>
              </div>

              {/* Bar with ideal marker */}
              <div className="relative h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-visible mb-1.5">
                <div
                  className={`h-full rounded-full transition-all ${barColor}`}
                  style={{ width: `${barPct}%` }}
                />
                {/* Ideal threshold marker */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-gray-400 rounded z-10"
                  style={{ left: `${row.ideal}%` }}
                />
              </div>

              {/* Category description */}
              <p className="text-xs text-gray-400 dark:text-gray-500">{row.desc}</p>

              {/* Status message */}
              <p className={`text-xs mt-0.5 font-medium ${
                row.key === 'surplus'
                  ? actual >= row.ideal ? 'text-green-600' : 'text-amber-600'
                  : isOver ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'
              }`}>
                {statusMsg}
              </p>
            </div>
          )
        })}
      </div>

      {/* Uncategorized note */}
      {totalAccountedPct < 80 && (
        <p className="text-xs text-amber-600 mt-4 bg-amber-50 rounded-xl px-3 py-2">
          Some spending may be uncategorized — categorize transactions for a more accurate breakdown.
        </p>
      )}

      {/* Indonesian context note */}
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 leading-relaxed">
        The 50/30/20 rule is a guideline, not a strict rule. Indonesian context: high cost-of-living cities (Jakarta) may push needs above 50%. Aim to keep surplus ≥20% to build long-term wealth.
      </p>
    </div>
  )
}
