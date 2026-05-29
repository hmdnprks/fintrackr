/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useMemo, useState } from 'react'
import {
  getSavedStatements,
  deleteStatementsByMonth,
  clearAllStatements,
} from '@/lib/storage'
import {
  getManualTransactions,
  deleteManualTransaction,
} from '@/lib/manualStorage'

function extractMonthMeta(period?: string) {
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
  const [manualTxs, setManualTxs] = useState(() =>
    getManualTransactions()
  )

  const reload = useCallback(() => {
    setRawStatements(getSavedStatements())
    setManualTxs(getManualTransactions())
  }, [])

  const statements = useMemo(() => {
    const enriched = rawStatements
      .map((s: any) => {
        const meta = extractMonthMeta(s.accountSummary?.period)
        if (!meta) return null
        return { ...s, ...meta }
      })
      .filter(Boolean)

    if (manualTxs.length === 0) return enriched

    const manualTxKeys = new Set<string>()
    const manualGroups: Record<string, any> = {}

    for (const tx of manualTxs) {
      const date = new Date(tx.transactionDate)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const monthLabel = date.toLocaleString('en-US', {
        month: 'long',
        year: 'numeric',
      })

      manualTxKeys.add(monthKey)

      if (!manualGroups[monthKey]) {
        manualGroups[monthKey] = {
          id: `manual-${monthKey}`,
          importedAt: new Date().toISOString(),
          accountSummary: { period: `01/${monthKey.split('-')[1]}/${monthKey.split('-')[0].slice(2)}` },
          monthKey,
          monthLabel,
          monthDate: new Date(date.getFullYear(), date.getMonth()),
          transactions: [],
        }
      }

      manualGroups[monthKey].transactions.push({
        transactionDate: `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`,
        detail: tx.detail,
        amount: tx.amount,
        type: tx.type,
        category: tx.category,
        reference: `MANUAL-${tx.id.slice(0, 8)}`,
      })
    }

    const merged = [...enriched]

    for (const key of Object.keys(manualGroups)) {
      const existing = merged.find((s: any) => s.monthKey === key)
      if (existing) {
        existing.transactions = [
          ...(existing.transactions || []),
          ...manualGroups[key].transactions,
        ]
      } else {
        merged.push(manualGroups[key])
      }
    }

    return merged.sort(
      (a: any, b: any) => a.monthDate.getTime() - b.monthDate.getTime()
    )
  }, [rawStatements, manualTxs])

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

  const availableYears = useMemo(() => {
    const years = new Set<string>()
    statements.forEach((s: any) => {
      const year = s.monthKey?.split('-')[0]
      if (year) years.add(year)
    })
    return Array.from(years).sort()
  }, [statements])

  const deleteMonth = useCallback(
    (monthKey: string) => {
      if (!monthKey || monthKey === 'all') return
      const confirmed = confirm(`Delete all data for ${monthKey}?`)
      if (!confirmed) return

      const [year, month] = monthKey.split('-')
      const manualToRemove = manualTxs.filter((tx) => {
        const d = new Date(tx.transactionDate)
        const ky = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        return ky === monthKey
      })
      manualToRemove.forEach((tx) => deleteManualTransaction(tx.id))

      deleteStatementsByMonth(monthKey)
      reload()
    },
    [reload, manualTxs]
  )

  const clearAll = useCallback(() => {
    const confirmed = confirm('Delete ALL saved data?')
    if (!confirmed) return

    clearAllStatements()
    const manual = getManualTransactions()
    manual.forEach((tx) => deleteManualTransaction(tx.id))
    setRawStatements([])
    setManualTxs([])
  }, [])

  return {
    statements,
    availableMonths,
    availableYears,
    deleteMonth,
    clearAll,
    reload,
    manualTxs,
    setManualTxs,
  }
}
