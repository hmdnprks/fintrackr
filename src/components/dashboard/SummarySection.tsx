import SummaryCard from '@/components/ui/SummaryCard'
import { ArrowUpIcon, ArrowDownIcon, WalletIcon } from '@heroicons/react/24/solid'

interface Props {
  totalIncome: number
  totalExpense: number
  formatIDR: (n: number) => string
}

export default function SummarySection({
  totalIncome,
  totalExpense,
  formatIDR,
}: Props) {
  return (
    <div className="grid md:grid-cols-3 gap-6">
      <SummaryCard
        icon={<ArrowUpIcon className="w-4 h-4 text-green-600" />}
        label="Income"
        value={formatIDR(totalIncome)}
        valueColor="text-green-600"
      />
      <SummaryCard
        icon={<ArrowDownIcon className="w-4 h-4 text-red-600" />}
        label="Expense"
        value={formatIDR(totalExpense)}
        valueColor="text-red-600"
      />
      <SummaryCard
        icon={<WalletIcon className="w-4 h-4 text-blue-600" />}
        label="Net"
        value={formatIDR(totalIncome - totalExpense)}
      />
    </div>
  )
}
