'use client'

interface Props {
  rate: number
  total: number
  items: { description: string; amount: number }[]
  totalIncome: number
}

function formatIDR(n: number) {
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}jt`
  if (n >= 1_000)     return `Rp ${Math.round(n / 1_000)}rb`
  return `Rp ${Math.round(n).toLocaleString('id-ID')}`
}

function formatIDRFull(n: number) {
  return `Rp ${Math.round(n).toLocaleString('id-ID')}`
}

const IDEAL = 15   // minimum investment rate target
const GREAT  = 20  // strong investment rate

export default function InvestmentRateSection({ rate, total, items, totalIncome }: Props) {
  if (!totalIncome) return null

  const rateColor = rate >= GREAT  ? 'text-green-600'
                  : rate >= IDEAL  ? 'text-amber-500'
                  : 'text-red-500'

  const barPct = Math.min(100, rate)
  const barColor = rate >= GREAT  ? 'bg-green-500'
                 : rate >= IDEAL  ? 'bg-amber-400'
                 : 'bg-red-400'

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Investment Rate</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            % of income directed to investment platforms this period
          </p>
        </div>
        <div className="text-right shrink-0 ml-4">
          <p className={`text-2xl font-bold ${rateColor}`}>{rate}%</p>
          <p className="text-xs text-gray-400">{formatIDR(total)} invested</p>
        </div>
      </div>

      {/* Progress bar with target markers */}
      <div className="mb-1.5">
        <div className="relative h-3 bg-gray-100 rounded-full overflow-visible">
          <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${barPct}%` }} />
          {/* 15% marker */}
          <div className="absolute top-0 bottom-0 w-0.5 bg-gray-400 rounded" style={{ left: '15%' }} />
          {/* 20% marker */}
          <div className="absolute top-0 bottom-0 w-0.5 bg-gray-400 rounded" style={{ left: '20%' }} />
        </div>
      </div>
      <div className="flex justify-between text-xs text-gray-400 mb-4">
        <span>0%</span>
        <span>15% min</span>
        <span>20% great</span>
        <span>100%</span>
      </div>

      {/* Status message */}
      <p className="text-xs text-gray-500 leading-relaxed mb-4">
        {rate >= GREAT
          ? `Strong investment discipline at ${rate}%. You're building long-term wealth effectively.`
          : rate >= IDEAL
          ? `Investment rate of ${rate}% meets the minimum target. Aim for 20%+ to accelerate wealth building.`
          : rate > 0
          ? `Investment rate of ${rate}% is below the 15% target. Try to increase contributions when income allows.`
          : `No investment transfers detected this period. If you invest via Bibit or similar, check the note below.`}
      </p>

      {/* Detected transactions */}
      {items.length > 0 ? (
        <div className="space-y-2 mb-4">
          {items.map((item, i) => (
            <div key={i} className="flex items-center justify-between gap-3 text-sm">
              <p className="text-gray-600 truncate min-w-0">{item.description}</p>
              <p className="font-medium text-gray-800 shrink-0">{formatIDRFull(item.amount)}</p>
            </div>
          ))}
        </div>
      ) : null}

      {/* Detection note */}
      <div className="bg-gray-50 rounded-xl px-4 py-3 text-xs text-gray-500 leading-relaxed space-y-1.5">
        <p className="font-medium text-gray-600">How this is detected</p>
        <p>
          Transactions are scanned for known investment platform names: Bibit, Stockbit, Ajaib, Bareksa,
          IPOT, Indopremier, Mandiri Sekuritas, Pluang, and others.
          If your investment transfers use a different description, they won&apos;t appear here.
        </p>
        <p>
          To improve accuracy, add a custom keyword rule in <strong>Settings → Categorization Rules</strong> matching
          your investment transfer description. Transfers detected this way appear in the Transfer category —
          your actual holdings are tracked in the <strong>Assets tab</strong>.
        </p>
      </div>
    </div>
  )
}
