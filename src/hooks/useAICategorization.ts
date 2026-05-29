/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback } from 'react'
import { getSavedStatements } from '@/lib/storage'
import { categorizeTransaction } from '@/lib/categorizer/mandiri/transactionCategorizer'
import { getVaultDataSync, saveVaultData } from '@/lib/storage/secureStorage'

export function useAICategorization(
  reloadStatements: () => void
) {
  const [isCategorizing, setIsCategorizing] = useState(false)
  const [isGeneratingInsights, setIsGeneratingInsights] =
    useState(false)
  const [error, setError] = useState<string | null>(null)
  const [insights, setInsights] = useState<string | null>(null)
  const [categorizedResult, setCategorizedResult] = useState<{
    total: number
    success: number
    remaining: { detail: string; amount: number }[]
  } | null>(null)

  const categorizeAll = useCallback(async () => {
    setIsCategorizing(true)
    setError(null)
    setCategorizedResult(null)

    try {
      const statements = getSavedStatements()
      if (!statements.length) return

      const uncategorized: {
        txIndex: number
        statementIndex: number
        detail: string
        amount: number
        type: string
      }[] = []

      statements.forEach((statement: any, si: number) => {
        ; (statement.transactions || []).forEach(
          (tx: any, ti: number) => {
            const storedCategory = tx.category
            const ruleCategory = categorizeTransaction(
              tx.detail,
              tx.type
            )
            const effective = storedCategory || ruleCategory
            if (effective === 'Uncategorized') {
              uncategorized.push({
                txIndex: ti,
                statementIndex: si,
                detail: tx.detail,
                amount: tx.amount,
                type: tx.type,
              })
            }
          }
        )
      })

      if (uncategorized.length === 0) {
        setIsCategorizing(false)
        return
      }

      const payload = {
        transactions: uncategorized.map((u) => ({ detail: u.detail })),
        type: 'categorize',
        apiKey: getVaultDataSync().settings?.chatApiKey || undefined,
      }

      const res = await fetch('/api/categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!data.success) {
        throw new Error(data.error || 'Categorization failed')
      }

      if (data.categories?.length !== uncategorized.length) {
        throw new Error(
          `Expected ${uncategorized.length} categories, got ${data.categories?.length}`
        )
      }

      const updated = [...statements]

      uncategorized.forEach((u, i) => {
        const category = data.categories[i] as string
        if (updated[u.statementIndex]?.transactions?.[u.txIndex]) {
          updated[u.statementIndex].transactions[u.txIndex].category =
            category
        }
      })

      localStorage.setItem('fintrackr', JSON.stringify(updated))
      setCategorizedResult({
        total: uncategorized.length,
        success: data.categories.filter(
          (c: string) => c !== 'Uncategorized'
        ).length,
        remaining: data.categories
          .map((c: string, i: number) =>
            c === 'Uncategorized'
              ? {
                detail: uncategorized[i].detail,
                amount: uncategorized[i].amount,
              }
              : null
          )
          .filter(Boolean),
      })
      reloadStatements()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsCategorizing(false)
    }
  }, [reloadStatements])

  const getInsights = useCallback(
    async (transactions: any[], year?: string, month?: string) => {
      const cacheKey = `fintrackr_insights_${year || 'all'}_${month || 'all'}`
      const cached = sessionStorage.getItem(cacheKey)
      if (cached) {
        setInsights(cached)
        return
      }

      if (!transactions.length) {
        setError('No transactions for this period.')
        return
      }

      setIsGeneratingInsights(true)
      setError(null)
      setInsights(null)

      try {
        const allTxs = transactions.map((tx: any) => ({
          detail: tx.detail,
          amount: tx.amount,
          type: tx.type,
          category: tx.category || 'Uncategorized',
        }))

        const periodLabel =
          month && month !== 'all'
            ? (() => {
                const [y, m] = month.split('-').map(Number)
                return new Date(y, m - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })
              })()
            : year && year !== 'all'
            ? year
            : 'all time'

        const payload = {
          transactions: allTxs,
          type: 'insights',
          period: periodLabel,
          apiKey: getVaultDataSync().settings?.chatApiKey || undefined,
        }

        const res = await fetch('/api/categorize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        const data = await res.json()

        if (!data.success) {
          throw new Error(data.error || 'Failed to generate insights')
        }

        sessionStorage.setItem(cacheKey, data.insights)
        setInsights(data.insights)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setIsGeneratingInsights(false)
      }
    },
    []
  )

  return {
    isCategorizing,
    isGeneratingInsights,
    error,
    insights,
    categorizedResult,
    categorizeAll,
    getInsights,
    clearCategorizedResult: () => setCategorizedResult(null),
    clearError: () => setError(null),
    clearInsights: () => {
      const keys = Object.keys(sessionStorage).filter((k) =>
        k.startsWith('fintrackr_insights_')
      )
      keys.forEach((k) => sessionStorage.removeItem(k))
      setInsights(null)
    },
  }
}
