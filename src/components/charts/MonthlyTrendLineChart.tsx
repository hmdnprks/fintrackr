/* eslint-disable @typescript-eslint/no-explicit-any */
import '@/lib/chartjs'
import { Line } from 'react-chartjs-2'

interface Props {
  data: any
}

export default function MonthlyTrendLineChart({ data }: Props) {
  return (
    <div className="h-64">
      <Line
        data={data}
        options={{
          responsive: true,
          maintainAspectRatio: false,
        }}
      />
    </div>
  )
}
