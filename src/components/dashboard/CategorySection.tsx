/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'
import ChartContainer from '@/components/ui/ChartContainer'
import ChartToggle from '@/components/ui/ChartToggle'
import CategoryChart from '@/components/charts/CategoryChart'

interface Props {
  chartData: any
  percentages: string[]
}

export default function CategorySection({
  chartData,
  percentages,
}: Props) {
  const [type, setType] = useState<'bar' | 'donut'>('donut')

  return (
    <ChartContainer
      title="Transaction by Category"
      right={
        <ChartToggle
          value={type}
          onChange={(v) => setType(v as any)}
          options={[
            { label: 'Bar', value: 'bar' },
            { label: 'Donut', value: 'donut' },
          ]}
        />
      }
      height="h-72"
    >
      <CategoryChart
        type={type}
        data={chartData}
        percentages={percentages}
        formatIDR={(n) =>
          new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
          }).format(n)
        }
      />
    </ChartContainer>
  )
}
