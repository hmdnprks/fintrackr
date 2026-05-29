/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect, useMemo } from 'react'
import MonthlyTrendLineChart from '@/components/charts/MonthlyTrendLineChart'

const WINDOW = 12  // months visible at once
const STEP   = 6   // months to jump per arrow click

function shortLabel(label: string): string {
  // "January 2024" → "Jan '24"
  return label.replace(/^(\w{3})\w+\s\d{2}(\d{2})$/, "$1 '$2")
}

interface Props {
  data: any
}

export default function MonthlyTrendSection({ data }: Props) {
  const total = data?.labels?.length ?? 0

  // windowEnd points to the last visible index (exclusive) — default to showing latest months
  const [windowEnd, setWindowEnd] = useState(total)
  useEffect(() => { setWindowEnd(total) }, [total])

  const needsNav = total > WINDOW
  const end   = Math.min(windowEnd, total)
  const start = Math.max(0, end - WINDOW)

  const sliced = useMemo(() => {
    if (!needsNav) return data
    return {
      ...data,
      labels:   data.labels.slice(start, end),
      datasets: data.datasets?.map((ds: any) => ({
        ...ds,
        data: ds.data.slice(start, end),
      })),
    }
  }, [data, needsNav, start, end])

  const canBack    = start > 0
  const canForward = end < total
  const rangeLabel = needsNav && total > 0
    ? `${shortLabel(data.labels[start])} – ${shortLabel(data.labels[end - 1])}`
    : null

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Monthly Trend</h2>

        {needsNav && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWindowEnd((e: number) => Math.max(WINDOW, e - STEP))}
              disabled={!canBack}
              title="Earlier"
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>

            <span className="text-xs text-gray-400 tabular-nums min-w-[110px] text-center">
              {rangeLabel}
            </span>

            <button
              onClick={() => setWindowEnd((e: number) => Math.min(total, e + STEP))}
              disabled={!canForward}
              title="Later"
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <MonthlyTrendLineChart data={sliced} />
    </div>
  )
}
