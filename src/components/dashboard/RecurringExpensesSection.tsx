'use client'

interface RecurringItem {
  description: string
  category: string
  avgMonthly: number
  months: number
}

interface Props {
  items: RecurringItem[]
  avgMonthlyIncome: number   // for % of income calculation
}

const CATEGORY_COLOR: Record<string, string> = {
  'Housing':         'bg-blue-50 text-blue-700',
  'Services':        'bg-indigo-50 text-indigo-700',
  'Entertainment':   'bg-pink-50 text-pink-700',
  'Insurance':       'bg-orange-50 text-orange-700',
  'Bank Charges':    'bg-gray-100 text-gray-600',
  'Health & Medical':'bg-red-50 text-red-700',
  'Transportation':  'bg-amber-50 text-amber-700',
}

function formatIDR(n: number) {
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}jt`
  if (n >= 1_000)     return `Rp ${Math.round(n / 1_000)}rb`
  return `Rp ${Math.round(n).toLocaleString('id-ID')}`
}

function formatIDRFull(n: number) {
  return `Rp ${Math.round(n).toLocaleString('id-ID')}`
}

export default function RecurringExpensesSection({ items, avgMonthlyIncome }: Props) {
  if (items.length === 0) return null

  const totalMonthly = items.reduce((s, i) => s + i.avgMonthly, 0)
  const incomePct = avgMonthlyIncome > 0
    ? Math.round((totalMonthly / avgMonthlyIncome) * 100)
    : null

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm">
      <div className="flex items-start justify-between mb-1">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Fixed Monthly Commitments</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Expenses detected in 2+ months — money you can&apos;t easily cut
          </p>
        </div>
        <div className="text-right shrink-0 ml-4">
          <p className="text-2xl font-bold text-gray-900">{formatIDR(totalMonthly)}</p>
          <p className="text-xs text-gray-400">
            {incomePct !== null ? `${incomePct}% of avg income` : 'per month avg'}
          </p>
        </div>
      </div>

      {incomePct !== null && (
        <p className="text-xs text-gray-500 mb-5">
          {incomePct <= 30
            ? `${incomePct}% of income locked in fixed costs — healthy, leaves room to adjust spending.`
            : incomePct <= 50
            ? `${incomePct}% of income in fixed commitments — manageable but watch discretionary spending.`
            : `${incomePct}% of income locked in fixed costs — high. Consider which commitments can be reduced.`}
        </p>
      )}

      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="bg-gray-50 rounded-xl px-4 py-3">
            {/* Description — full width, wraps naturally */}
            <p className="text-sm font-medium text-gray-800 break-words mb-1.5">{item.description}</p>
            {/* Metadata row */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLOR[item.category] ?? 'bg-gray-100 text-gray-600'}`}>
                  {item.category}
                </span>
                <span className="text-xs text-gray-400">{item.months} months</span>
              </div>
              <p className="text-sm font-semibold text-gray-800 shrink-0">
                {formatIDR(item.avgMonthly)}<span className="text-xs text-gray-400 font-normal">/mo</span>
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between text-sm">
        <span className="text-gray-500 font-medium">Total fixed per month</span>
        <span className="font-bold text-gray-900">{formatIDRFull(totalMonthly)}</span>
      </div>

      <p className="text-xs text-gray-400 mt-3 leading-relaxed">
        Detected from categories that commonly have fixed costs. Amounts are averages across months where the expense appeared.
        One-off transactions in these categories may appear here if their description is consistent.
      </p>
    </div>
  )
}
