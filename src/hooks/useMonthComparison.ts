/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from 'react'
import { categorizeTransaction } from '@/lib/categorizer/mandiri/transactionCategorizer'

export type CategoryChange = {
  category: string
  current: number
  prev: number
  delta: number
  pct: number | null  // null when prev was 0
}

export type MonthComparisonData = {
  prevMonthKey: string
  prevMonthLabel: string
  currentIncome: number
  currentExpense: number
  prevIncome: number
  prevExpense: number
  hasPrevData: boolean
  categoryChanges: CategoryChange[]
}

function getPrevMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number)
  const d = new Date(year, month - 2)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function getPrevMonthLabel(prevKey: string): string {
  const [year, month] = prevKey.split('-').map(Number)
  return new Date(year, month - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })
}

function aggregateMonth(statements: any[], monthKey: string) {
  const spending: Record<string, number> = {}
  let income = 0
  let expense = 0

  for (const s of statements) {
    if (s.monthKey !== monthKey) continue
    for (const tx of s.transactions || []) {
      const cat = tx.category || categorizeTransaction(tx.detail, tx.type)
      const amt = tx.amount || 0
      if (tx.type === 'credit') {
        income += amt
      } else {
        expense += amt
        spending[cat] = (spending[cat] || 0) + amt
      }
    }
  }

  return { income, expense, spending }
}

export function useMonthComparison(
  statements: any[],
  selectedMonth: string
): MonthComparisonData | null {
  return useMemo(() => {
    if (!selectedMonth || selectedMonth === 'all') return null

    const prevKey = getPrevMonthKey(selectedMonth)
    const curr = aggregateMonth(statements, selectedMonth)
    const prev = aggregateMonth(statements, prevKey)

    const hasPrevData = prev.income > 0 || prev.expense > 0

    // Collect all expense categories from both months
    const allCategories = new Set([
      ...Object.keys(curr.spending),
      ...Object.keys(prev.spending),
    ])

    const categoryChanges: CategoryChange[] = Array.from(allCategories)
      .map((category) => {
        const current = curr.spending[category] || 0
        const p = prev.spending[category] || 0
        const delta = current - p
        const pct = p > 0 ? ((current - p) / p) * 100 : null
        return { category, current, prev: p, delta, pct }
      })
      .filter((c) => c.current > 0 || c.prev > 0)
      .sort((a, b) => {
        // Sort by absolute % change descending, then by current amount
        const aPct = a.pct !== null ? Math.abs(a.pct) : (a.current > 0 ? 100 : 0)
        const bPct = b.pct !== null ? Math.abs(b.pct) : (b.current > 0 ? 100 : 0)
        return bPct - aPct
      })

    return {
      prevMonthKey: prevKey,
      prevMonthLabel: getPrevMonthLabel(prevKey),
      currentIncome: curr.income,
      currentExpense: curr.expense,
      prevIncome: prev.income,
      prevExpense: prev.expense,
      hasPrevData,
      categoryChanges,
    }
  }, [statements, selectedMonth])
}
