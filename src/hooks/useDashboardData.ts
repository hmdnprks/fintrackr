/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from 'react'
import { categorizeTransaction } from '@/lib/categorizer/mandiri/transactionCategorizer'
import { aggregateTransactions } from '@/lib/finance'
import { parseTransactionDate } from '@/lib/formatter'
import { detectRecurringUncategorized } from '@/lib/insights/recurring'

export function useDashboardData(statements: any[], selectedMonth: string) {

  /**
   * Filter by month
   */
  const filteredStatements = useMemo(() => {
    if (selectedMonth === 'all') return statements
    return statements.filter((s) => s.monthKey === selectedMonth)
  }, [statements, selectedMonth])

  /**
   * Flatten & enrich transactions
   */
  const allTransactions = useMemo(() => {
    return filteredStatements
      .flatMap((s) =>
        (s.transactions || []).map((t: any) => ({
          ...t,
          category: categorizeTransaction(t.detail, t.type),
          fullDate: parseTransactionDate(
            t.transactionDate,
            s.monthDate
          ),
        }))
      )
      .sort(
        (a, b) =>
          a.fullDate.getTime() - b.fullDate.getTime()
      )
  }, [filteredStatements])

  /**
   * Totals
   */
  const { totalIncome, totalExpense } =
    useMemo(() => aggregateTransactions(filteredStatements),
      [filteredStatements]
    )

  /**
   * Trend Calculation
   */
  const trendChartData = useMemo(() => {
    const map: Record<
      string,
      { label: string; income: number; expense: number }
    > = {}

    statements.forEach((s) => {
      if (!map[s.monthKey]) {
        map[s.monthKey] = {
          label: s.monthLabel,
          income: 0,
          expense: 0,
        }
      }

      s.transactions?.forEach((t: any) => {
        if (t.type === 'credit')
          map[s.monthKey].income += t.amount || 0
        if (t.type === 'debit')
          map[s.monthKey].expense += t.amount || 0
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

  /**
   * Category Aggregation
   */
  const {
    categoryChartData,
    categoryPercentages,
  } = useMemo(() => {

    const map: Record<string, number> = {}

    allTransactions.forEach((tx) => {
      const category = tx.category || 'Uncategorized'
      map[category] = (map[category] || 0) + (tx.amount || 0)
    })

    const entries = Object.entries(map).sort((a, b) => b[1] - a[1])
    const total = entries.reduce((sum, [, val]) => sum + val, 0)

    const labels = entries.map(([label]) => label)
    const values = entries.map(([, value]) => value)

    return {
      categoryChartData: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: [
              '#ef4444',
              '#f97316',
              '#eab308',
              '#22c55e',
              '#3b82f6',
              '#a855f7',
              '#14b8a6',
              '#f43f5e',
              '#6366f1',
            ],
            borderWidth: 1,
          },
        ],
      },
      categoryPercentages: entries.map(([, value]) =>
        total === 0
          ? '0'
          : ((value / total) * 100).toFixed(1)
      ),
    }
  }, [allTransactions])

  /**
   * Recurring Detection
   */
  const recurringSuggestions = useMemo(() => {
    return detectRecurringUncategorized(allTransactions, 2)
  }, [allTransactions])

  return {
    totalIncome,
    totalExpense,
    trendChartData,
    categoryChartData,
    categoryPercentages,
    allTransactions,
    recurringSuggestions,
  }
}
