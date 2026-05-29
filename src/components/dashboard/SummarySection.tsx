import SummaryCard from '@/components/ui/SummaryCard'
import { ArrowUpIcon, ArrowDownIcon, WalletIcon } from '@heroicons/react/24/solid'
import type { MonthComparisonData } from '@/hooks/useMonthComparison'

interface Props {
  totalIncome: number
  totalExpense: number
  formatIDR: (n: number) => string
  comparison?: MonthComparisonData | null
}

function deltaPct(current: number, prev: number): number | null {
  if (prev === 0) return null
  return ((current - prev) / prev) * 100
}

export default function SummarySection({
  totalIncome,
  totalExpense,
  formatIDR,
  comparison,
}: Props) {
  const hasDelta = comparison?.hasPrevData ?? false

  const incomePct  = hasDelta ? deltaPct(totalIncome,  comparison!.prevIncome)  : null
  const expensePct = hasDelta ? deltaPct(totalExpense, comparison!.prevExpense) : null
  const netCurr = totalIncome - totalExpense
  const netPrev = (comparison?.prevIncome ?? 0) - (comparison?.prevExpense ?? 0)
  const netPct  = hasDelta ? deltaPct(netCurr, netPrev) : null

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <SummaryCard
        icon={<ArrowUpIcon className="w-4 h-4 text-green-600" />}
        label="Income"
        value={formatIDR(totalIncome)}
        valueColor="text-green-600"
        delta={incomePct != null ? { pct: incomePct, isGood: incomePct >= 0 } : null}
      />
      <SummaryCard
        icon={<ArrowDownIcon className="w-4 h-4 text-red-600" />}
        label="Expense"
        value={formatIDR(totalExpense)}
        valueColor="text-red-600"
        delta={expensePct != null ? { pct: expensePct, isGood: expensePct <= 0 } : null}
      />
      <SummaryCard
        icon={<WalletIcon className={`w-4 h-4 ${netCurr >= 0 ? 'text-blue-600' : 'text-red-500'}`} />}
        label="Net"
        value={formatIDR(netCurr)}
        valueColor={netCurr >= 0 ? 'text-gray-800' : 'text-red-500'}
        delta={netPct != null ? { pct: netPct, isGood: netPct >= 0 } : null}
      />
    </div>
  )
}
