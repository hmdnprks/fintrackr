/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from 'react'
import { detectRecurringUncategorized } from '@/lib/insights/recurring'

export function useRecurringSuggestions(transactions: any[]) {
  return useMemo(() => {
    return detectRecurringUncategorized(transactions, 2)
  }, [transactions])
}
