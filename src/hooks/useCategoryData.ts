/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from 'react'

export function useCategoryData(transactions: any[]) {
  return useMemo(() => {
    const map: Record<string, number> = {}

    transactions.forEach((tx) => {
      const category = tx.category || 'Uncategorized'
      map[category] = (map[category] || 0) + (tx.amount || 0)
    })

    const entries = Object.entries(map).sort((a, b) => b[1] - a[1])
    const total = entries.reduce((sum, [, val]) => sum + val, 0)

    return {
      labels: entries.map(([k]) => k),
      values: entries.map(([, v]) => v),
      percentages: entries.map(([, v]) =>
        total === 0
          ? '0'
          : ((v / total) * 100).toFixed(1)
      ),
      entries,
    }
  }, [transactions])
}
