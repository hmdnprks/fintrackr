'use client'

interface MonthData {
  label: string
  income: number
  expense: number
  rate: number
}

interface Props {
  data: MonthData[]
}

function shortLabel(label: string): string {
  // "January 2024" → "Jan"
  return label.slice(0, 3)
}

export default function SavingsRateTrendSection({ data }: Props) {
  if (data.length < 2) return null

  const avg = Math.round(data.reduce((s, d) => s + d.rate, 0) / data.length)
  const bestEntry = data.reduce((a, b) => b.rate > a.rate ? b : a)
  const best = bestEntry.rate
  // "January 2024" → "Jan 2024"
  const bestMonth = bestEntry.label.replace(/^(\w{3})\w+\s/, '$1 ')
  const IDEAL = 20  // minimum savings rate target

  // Clamp bars to ±100% for display
  const clamp = (n: number) => Math.max(-100, Math.min(100, n))

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm">
      <div className="flex items-start justify-between mb-1">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Savings Rate</h2>
          <p className="text-xs text-gray-400 mt-0.5">% of income kept after categorized spending — Transfer excluded (see note below)</p>
        </div>
        <div className="text-right shrink-0 ml-4">
          <p className={`text-2xl font-bold ${avg >= IDEAL ? 'text-green-600' : avg >= 10 ? 'text-amber-500' : 'text-red-500'}`}>
            {avg}%
          </p>
          <p className="text-xs text-gray-400">avg this period</p>
        </div>
      </div>

      {/* Target badges */}
      <div className="flex gap-2 mb-5 flex-wrap">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${avg >= 30 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          ≥30% great
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${avg >= IDEAL && avg < 30 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          ≥20% good
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${avg < IDEAL && avg >= 10 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
          10–19% low
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${avg < 10 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
          {'<'}10% critical
        </span>
      </div>

      {/* Bar chart */}
      <div className="flex items-end gap-1.5 h-28 relative">
        {/* 20% reference line */}
        <div
          className="absolute left-0 right-0 border-t border-dashed border-blue-300 z-10"
          style={{ bottom: `${((clamp(IDEAL) + 100) / 200) * 100}%` }}
        >
          <span className="absolute -top-4 right-0 text-xs text-blue-400">20% target</span>
        </div>
        {/* 0% baseline */}
        <div
          className="absolute left-0 right-0 border-t border-gray-200"
          style={{ bottom: '50%' }}
        />

        {data.map((d, i) => {
          const clamped = clamp(d.rate)
          const isPositive = clamped >= 0
          const heightPct = Math.abs(clamped) / 2  // half of container (50% = 100% of income)
          const barColor = d.rate >= 30 ? 'bg-green-500' :
                           d.rate >= IDEAL ? 'bg-green-400' :
                           d.rate >= 10 ? 'bg-amber-400' :
                           d.rate >= 0 ? 'bg-red-400' : 'bg-red-600'

          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full relative group">
              {/* Tooltip */}
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none z-20">
                {d.label}: {d.rate}%
              </div>

              {/* Bar positioned from 50% baseline */}
              <div className="w-full absolute" style={{
                height: `${heightPct}%`,
                bottom: isPositive ? '50%' : `${50 - heightPct}%`,
              }}>
                <div className={`w-full h-full rounded-sm ${barColor}`} />
              </div>

              {/* Month label */}
              <span className="absolute -bottom-5 text-xs text-gray-400 truncate w-full text-center">
                {shortLabel(d.label)}
              </span>
            </div>
          )
        })}
      </div>

      {/* Month labels spacing */}
      <div className="mt-7" />

      {/* Summary insight */}
      <p className="text-xs text-gray-500 leading-relaxed mt-1">
        {avg >= 30
          ? `Strong savings discipline — you're keeping ${avg}% of income. Best month: ${bestMonth} at ${best}%.`
          : avg >= IDEAL
          ? `On track at ${avg}% average. Aim for 30% to accelerate wealth building. Best month: ${bestMonth} at ${best}%.`
          : avg >= 10
          ? `Savings rate of ${avg}% is below the 20% target. Review your wants spending to find room to save more.`
          : `Savings rate of ${avg}% is critically low. Your spending is consuming most of your income — review your budget urgently.`}
      </p>

      {/* Transfer exclusion note */}
      <div className="mt-4 bg-gray-50 rounded-xl px-4 py-3 text-xs text-gray-500 leading-relaxed space-y-1">
        <p className="font-medium text-gray-600">Why transfers are excluded</p>
        <p>
          The Transfer category mixes three things with very different meanings:
          credit card payments (spending already counted when you used the card),
          e-wallet top-ups (GoPay, OVO — will be spent, not saved), and
          transfers to savings or investment accounts (actual savings).
        </p>
        <p>
          Including all of them would double-count credit card spending and make
          your rate look lower than reality. Excluding all of them means investment
          transfers (e.g. to Bibit) are invisible here. This rate reflects your
          spending discipline on categorized purchases — use the <strong>Assets tab</strong> to
          track your true accumulated savings and investments.
        </p>
      </div>
    </div>
  )
}
