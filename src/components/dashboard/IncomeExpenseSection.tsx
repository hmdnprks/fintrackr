import ChartContainer from '@/components/ui/ChartContainer'
import IncomeExpenseBarChart from '@/components/charts/IncomeExpenseBarChart'
import { ChartBarIcon } from '@heroicons/react/24/solid'

interface Props {
  income: number
  expense: number
}

export default function IncomeExpenseSection({
  income,
  expense,
}: Props) {
  return (
    <ChartContainer
      title="Income vs Expense"
      icon={<ChartBarIcon className="w-5 h-5 text-blue-600" />}
      height="h-56"
    >
      <IncomeExpenseBarChart income={income} expense={expense} />
    </ChartContainer>
  )
}
