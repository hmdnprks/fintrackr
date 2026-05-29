import '@/lib/chartjs'
import { Bar } from 'react-chartjs-2'

interface Props {
  income: number
  expense: number
}

export default function IncomeExpenseBarChart({ income, expense }: Props) {
  return (
    <div className="h-56">
      <Bar
        data={{
          labels: ['Income', 'Expense'],
          datasets: [
            {
              data: [income, expense],
              backgroundColor: ['#22c55e', '#ef4444'],
              borderRadius: 8,
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
        }}
      />
    </div>
  )
}
