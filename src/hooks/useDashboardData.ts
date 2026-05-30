/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from 'react'
import { categorizeTransaction } from '@/lib/categorizer/mandiri/transactionCategorizer'
import { aggregateTransactions } from '@/lib/finance'
import { parseTransactionDate } from '@/lib/formatter'
import { detectRecurringUncategorized } from '@/lib/insights/recurring'

export function useDashboardData(statements: any[], selectedYear: string, selectedMonth: string) {

  /**
   * Filter by year
   */
  const yearFilteredStatements = useMemo(() => {
    if (selectedYear === 'all') return statements
    return statements.filter((s) => {
      const year = s.monthKey?.split('-')[0]
      return year === selectedYear
    })
  }, [statements, selectedYear])

  /**
   * Filter by month
   */
  const filteredStatements = useMemo(() => {
    if (selectedMonth === 'all') return yearFilteredStatements
    return yearFilteredStatements.filter((s) => s.monthKey === selectedMonth)
  }, [yearFilteredStatements, selectedMonth])

  /**
   * Flatten & enrich transactions
   */
  const allTransactions = useMemo(() => {
    return filteredStatements
      .flatMap((s) =>
        (s.transactions || []).map((t: any) => ({
          ...t,
          category: t.category || categorizeTransaction(t.detail, t.type),
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

    // Use year-filtered statements so the trend respects the year selector,
    // but intentionally ignore the month filter (a trend of one month is useless)
    yearFilteredStatements.forEach((s) => {
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
  }, [yearFilteredStatements])

  /**
   * Recurring Detection
   */
  const recurringSuggestions = useMemo(() => {
    return detectRecurringUncategorized(allTransactions, 2)
  }, [allTransactions])

  /**
   * Savings Rate Trend — per month, year-filtered (ignores month filter)
   * Excludes Transfer so credit card payments don't inflate expenses.
   */
  const savingsRateTrend = useMemo(() => {
    const EXCLUDE = new Set(['Transfer'])
    const map: Record<string, { label: string; income: number; expense: number }> = {}

    yearFilteredStatements.forEach((s) => {
      if (!s.monthKey) return
      if (!map[s.monthKey]) map[s.monthKey] = { label: s.monthLabel, income: 0, expense: 0 }
      s.transactions?.forEach((t: any) => {
        if (t.type === 'credit') map[s.monthKey].income += t.amount || 0
        if (t.type === 'debit' && !EXCLUDE.has(t.category || categorizeTransaction(t.detail, t.type)))
          map[s.monthKey].expense += t.amount || 0
      })
    })

    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, { label, income, expense }]) => ({
        label,
        income,
        expense,
        rate: income > 0 ? Math.round(((income - expense) / income) * 100) : 0,
      }))
  }, [yearFilteredStatements])

  /**
   * 50/30/20 Breakdown — uses filtered transactions (respects month selector)
   * Needs: essential fixed categories
   * Wants: discretionary + uncategorized (conservative assumption)
   * Surplus: income not spent on needs or wants (available for savings/investments)
   */
  const spendingBreakdown = useMemo(() => {
    const NEEDS = new Set(['Housing', 'Health & Medical', 'Groceries', 'Transportation', 'Insurance', 'Services', 'Education'])
    const WANTS = new Set(['Food & Dining', 'Shopping', 'Entertainment', 'Bank Charges', 'Uncategorized'])
    const EXCLUDE = new Set(['Transfer', 'Income'])

    let income = 0, needs = 0, wants = 0

    for (const tx of allTransactions) {
      const cat = tx.category || categorizeTransaction(tx.detail, tx.type)
      if (tx.type === 'credit') { income += tx.amount || 0; continue }
      if (EXCLUDE.has(cat)) continue
      if (NEEDS.has(cat)) needs += tx.amount || 0
      else if (WANTS.has(cat)) wants += tx.amount || 0
    }

    const surplus = Math.max(0, income - needs - wants)
    return { income, needs, wants, surplus }
  }, [allTransactions])

  return {
    totalIncome,
    totalExpense,
    trendChartData,
    allTransactions,
    recurringSuggestions,
    savingsRateTrend,
    spendingBreakdown,
  }
}
