/* eslint-disable @typescript-eslint/no-explicit-any */
import '@/lib/chartjs'
import { Bar, Pie } from 'react-chartjs-2'

interface Props {
  type: 'bar' | 'donut'
  data: any
  formatIDR: (n: number) => string
  percentages: string[]
}

export default function CategoryChart({
  type,
  data,
  formatIDR,
  percentages,
}: Props) {
  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
  }

  if (type === 'bar') {
    return (
      <Bar
        data={data}
        options={{
          ...commonOptions,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (context: any) => {
                  const index = context.dataIndex
                  return `${formatIDR(context.raw)} (${percentages[index]}%)`
                },
              },
            },
          },
        }}
      />
    )
  }

  return (
    <Pie
      data={data}
      options={{
        ...commonOptions,
        cutout: '60%',
      }}
    />
  )
}
