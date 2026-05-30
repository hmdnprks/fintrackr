/* eslint-disable @typescript-eslint/no-explicit-any */
import '@/lib/chartjs'
import { Line } from 'react-chartjs-2'

function abbreviateIDR(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000)     return `${(value / 1_000).toFixed(0)}K`
  return String(value)
}

function formatIDR(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value)
}

interface Props {
  data: any
}

export default function MonthlyTrendLineChart({ data }: Props) {
  const pointCount = data?.labels?.length ?? 0

  if (pointCount === 0) {
    return (
      <div className="h-64 flex items-center justify-center">
        <p className="text-sm text-gray-400">No trend data available.</p>
      </div>
    )
  }

  if (pointCount === 1) {
    return (
      <div className="h-64 flex items-center justify-center">
        <p className="text-sm text-gray-400">
          Import at least two months of data to see trends.
        </p>
      </div>
    )
  }

  const enrichedData = {
    ...data,
    datasets: data.datasets?.map((ds: any, i: number) => {
      // Dataset 2 = Savings % overlay — dashed indigo line on right axis, no fill
      if (i === 2) return {
        ...ds,
        tension: 0.35,
        pointRadius: 3,
        pointHoverRadius: 5,
        borderColor: '#8b5cf6',
        backgroundColor: 'transparent',
        pointBackgroundColor: '#8b5cf6',
        fill: false,
        borderDash: [5, 4],
        yAxisID: 'y1',
      }
      return {
        ...ds,
        tension: 0.35,
        pointRadius: 4,
        pointHoverRadius: 6,
        borderColor:          i === 0 ? '#22c55e' : '#ef4444',
        backgroundColor:      i === 0 ? '#22c55e20' : '#ef444420',
        pointBackgroundColor: i === 0 ? '#22c55e' : '#ef4444',
        fill: true,
        yAxisID: 'y',
      }
    }),
  }

  return (
    <div className="h-64">
      <Line
        data={enrichedData}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: 'index',
            intersect: false,
          },
          scales: {
            y: {
              grid: { color: '#f3f4f6' },
              ticks: {
                color: '#9ca3af',
                font: { size: 11 },
                callback: (value) => abbreviateIDR(value as number),
              },
            },
            y1: {
              type: 'linear' as const,
              display: true,
              position: 'right' as const,
              min: 0,
              max: 100,
              grid: { drawOnChartArea: false },
              ticks: {
                color: '#8b5cf6',
                font: { size: 10 },
                callback: (value) => `${value}%`,
                maxTicksLimit: 5,
              },
              border: { dash: [3, 3] },
            },
            x: {
              grid: { display: false },
              ticks: {
                color: '#9ca3af',
                font: { size: 11 },
              },
            },
          },
          plugins: {
            legend: {
              position: 'top',
              align: 'end',
              labels: {
                boxWidth: 10,
                boxHeight: 10,
                borderRadius: 5,
                useBorderRadius: true,
                color: '#6b7280',
                font: { size: 12 },
              },
            },
            tooltip: {
              callbacks: {
                label: (ctx: any) => ctx.datasetIndex === 2
                  ? ` ${ctx.dataset.label}: ${ctx.raw}%`
                  : ` ${ctx.dataset.label}: ${formatIDR(ctx.raw)}`,
              },
            },
          },
        }}
      />
    </div>
  )
}
