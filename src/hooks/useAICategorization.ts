/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback } from 'react'
import { getSavedStatements } from '@/lib/storage'
import { categorizeTransaction } from '@/lib/categorizer/mandiri/transactionCategorizer'

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
        ;(statement.transactions || []).forEach(
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
        apiKey: localStorage.getItem('fintrackr_chat_api_key') || undefined,
      }
      console.log('[AI Categorize] Prompt:', JSON.stringify(payload, null, 2))

      const res = await fetch('/api/categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      console.log('[AI Categorize] Result:', JSON.stringify(data, null, 2))

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
    async (year?: string, month?: string) => {
      const cacheKey = `fintrackr_insights_${year || 'all'}_${month || 'all'}`
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        setInsights(cached)
        return
      }

      setIsGeneratingInsights(true)
      setError(null)
      setInsights(null)

      try {
        const statements = getSavedStatements()
        if (!statements.length) return

        let filtered = [...statements]

        if (year && year !== 'all') {
          filtered = filtered.filter((s: any) => {
            const sy = s.monthKey?.split('-')[0]
            return sy === year
          })
        }

        if (month && month !== 'all') {
          filtered = filtered.filter(
            (s: any) => s.monthKey === month
          )
        }

        const allTxs = filtered.flatMap((s: any) =>
          (s.transactions || []).map((tx: any) => ({
            detail: tx.detail,
            amount: tx.amount,
            type: tx.type,
            category: tx.category || 'Uncategorized',
          }))
        )

        const payload = {
          transactions: allTxs,
          type: 'insights',
          apiKey: localStorage.getItem('fintrackr_chat_api_key') || undefined,
        }
        console.log(
          '[AI Insights] Prompt:',
          JSON.stringify(payload, null, 2)
        )

        const res = await fetch('/api/categorize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        const data = await res.json()
        console.log(
          '[AI Insights] Result:',
          JSON.stringify(data, null, 2)
        )

        if (!data.success) {
          throw new Error(
            data.error || 'Failed to generate insights'
          )
        }

        localStorage.setItem(cacheKey, data.insights)
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
      const keys = Object.keys(localStorage).filter((k) =>
        k.startsWith('fintrackr_insights_')
      )
      keys.forEach((k) => localStorage.removeItem(k))
      setInsights(null)
    },
  }
}
