/* eslint-disable @typescript-eslint/no-explicit-any */
import ChartContainer from '@/components/ui/ChartContainer'
import MonthlyTrendLineChart from '@/components/charts/MonthlyTrendLineChart'

interface Props {
  data: any
}

export default function MonthlyTrendSection({ data }: Props) {
  return (
    <ChartContainer title="Monthly Trend">
      <MonthlyTrendLineChart data={data} />
    </ChartContainer>
  )
}
