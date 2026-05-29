/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  getSavedStatements,
  deleteStatementsByMonth,
  clearAllStatements,
} from '@/lib/storage'

interface Statement {
  accountSummary?: {
    period?: string
  }
  [key: string]: any
}

interface EnrichedStatement extends Statement {
  monthKey: string
  monthLabel: string
  monthDate: Date
}

interface MonthOption {
  label: string
  value: string
}

export function extractMonthMeta(period?: string) {
  const match = period?.match(/\/(\d{2})\/(\d{2})/)
  if (!match) return null

  const month = match[1]
  const year = '20' + match[2]

  const date = new Date(Number(year), Number(month) - 1)

  return {
    monthKey: `${year}-${month}`,
    monthLabel: date.toLocaleString('en-US', {
      month: 'long',
      year: 'numeric',
    }),
    monthDate: date,
  }
}

export function useStatements() {
  const [rawStatements, setRawStatements] = useState(() =>
    getSavedStatements()
  )

  const reload = useCallback(() => {
    setRawStatements(getSavedStatements())
  }, [])

  const statements = useMemo(() => {
    return rawStatements
      .map((s: any) => {
        const meta = extractMonthMeta(
          s.accountSummary?.period
        )

        if (!meta) return null

        return {
          ...s,
          ...meta,
        }
      })
      .filter(Boolean)
      .sort(
        (a: any, b: any) =>
          a.monthDate.getTime() - b.monthDate.getTime()
      )
  }, [rawStatements])

  const availableMonths = useMemo(() => {
    const map = new Map<string, { label: string; value: string }>()

    statements.forEach((s: any) => {
      if (!map.has(s.monthKey)) {
        map.set(s.monthKey, {
          label: s.monthLabel,
          value: s.monthKey,
        })
      }
    })

    return Array.from(map.values()).sort((a, b) =>
      a.value.localeCompare(b.value)
    )
  }, [statements])

  const deleteMonth = useCallback(
    (monthKey: string) => {
      if (!monthKey || monthKey === 'all') return

      const confirmed = confirm(
        `Delete all data for ${monthKey}?`
      )
      if (!confirmed) return

      deleteStatementsByMonth(monthKey)
      reload()
    },
    [reload]
  )

  const clearAll = useCallback(() => {
    const confirmed = confirm(
      'Delete ALL saved statements?'
    )
    if (!confirmed) return

    clearAllStatements()
    setRawStatements([])
  }, [])

  return {
    statements,
    availableMonths,
    deleteMonth,
    clearAll,
    reload,
  }
}
