/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from 'react'

export function useTrendData(statements: any[]) {
  return useMemo(() => {
    const map: Record<string, any> = {}

    statements.forEach((s) => {
      if (!map[s.monthKey]) {
        map[s.monthKey] = {
          label: s.monthLabel,
          income: 0,
          expense: 0,
        }
      }

      s.transactions?.forEach((t: any) => {
        if (t.type === 'credit') map[s.monthKey].income += t.amount || 0
        if (t.type === 'debit') map[s.monthKey].expense += t.amount || 0
      })
    })

    const keys = Object.keys(map).sort()

    return {
      labels: keys.map((k) => map[k].label),
      datasets: [
        {
          label: 'Income',
          data: keys.map((k) => map[k].income),
          borderColor: '#22c55e',
          backgroundColor: '#22c55e',
        },
        {
          label: 'Expense',
          data: keys.map((k) => map[k].expense),
          borderColor: '#ef4444',
          backgroundColor: '#ef4444',
        },
      ],
    }
  }, [statements])
}
