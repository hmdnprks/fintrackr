/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback } from 'react'
import { getSavedStatements } from '@/lib/storage'
import { categorizeTransaction } from '@/lib/categorizer/mandiri/transactionCategorizer'
import { getVaultDataSync } from '@/lib/storage/secureStorage'

// Strip numbers, punctuation, and extra whitespace so "ALFAMART 001 JAKARTA"
// and "ALFAMART 002 BEKASI" normalize to the same key "alfamart  jakarta" → "alfamart jakarta"
function normalizeDescription(detail: string): string {
  return detail
    .toLowerCase()
    .replace(/\d+/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function useAICategorization(
  reloadStatements: () => void
) {
  const [isCategorizing, setIsCategorizing] = useState(false)
  const [categorizingStatus, setCategorizingStatus] = useState<string | null>(null)
  const [isGeneratingInsights, setIsGeneratingInsights] =
    useState(false)
  const [error, setError] = useState<string | null>(null)
  const [insights, setInsights] = useState<string | null>(null)
  const [categorizedResult, setCategorizedResult] = useState<{
    total: number
    learnedCount: number
    aiCount: number
    success: number
    remaining: { detail: string; amount: number }[]
  } | null>(null)

  const categorizeAll = useCallback(async () => {
    setIsCategorizing(true)
    setCategorizingStatus('Scanning transactions…')
    setError(null)
    setCategorizedResult(null)

    try {
      const statements = getSavedStatements()
      if (!statements.length) return

      // ── Phase 1: Build a "learned categories" map from already-categorized
      //    transactions. This lets us re-apply known merchants without any API call.
      const learnedCategories = new Map<string, string>()
      statements.forEach((statement: any) => {
        ;(statement.transactions || []).forEach((tx: any) => {
          const storedCat = tx.category
          const ruleCat = categorizeTransaction(tx.detail, tx.type)
          const effective = storedCat || ruleCat
          if (effective !== 'Uncategorized') {
            const key = normalizeDescription(tx.detail)
            // Prefer manually stored categories over rule-derived
            if (!learnedCategories.has(key) || storedCat) {
              learnedCategories.set(key, effective)
            }
          }
        })
      })

      // ── Phase 2: Collect uncategorized transactions ──
      const uncategorized: {
        txIndex: number
        statementIndex: number
        detail: string
        amount: number
        type: string
      }[] = []

      statements.forEach((statement: any, si: number) => {
        ;(statement.transactions || []).forEach((tx: any, ti: number) => {
          const storedCategory = tx.category
          const ruleCategory = categorizeTransaction(tx.detail, tx.type)
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
        })
      })

      if (uncategorized.length === 0) {
        setIsCategorizing(false)
        setCategorizingStatus(null)
        return
      }

      const updated = [...statements]

      // ── Phase 3: Apply learned categories (zero API calls) ──
      setCategorizingStatus(`Applying learned rules to ${uncategorized.length.toLocaleString('id-ID')} transactions…`)

      const needsAI: typeof uncategorized = []
      let learnedCount = 0

      for (const u of uncategorized) {
        const key = normalizeDescription(u.detail)
        const learned = learnedCategories.get(key)
        if (learned) {
          updated[u.statementIndex].transactions[u.txIndex].category = learned
          learnedCount++
        } else {
          needsAI.push(u)
        }
      }

      let aiCount = 0
      const remaining: { detail: string; amount: number }[] = []

      // ── Phase 4: Deduplicate remaining → send unique descriptions to AI ──
      if (needsAI.length > 0) {
        // Group by normalized description so "ALFAMART 001" and "ALFAMART 002"
        // map to the same AI request. Only the representative is sent.
        const groups = new Map<string, { representative: string; amount: number; indices: { si: number; ti: number }[] }>()
        for (const u of needsAI) {
          const key = normalizeDescription(u.detail)
          if (!groups.has(key)) {
            groups.set(key, { representative: u.detail, amount: u.amount, indices: [] })
          }
          groups.get(key)!.indices.push({ si: u.statementIndex, ti: u.txIndex })
        }

        const uniqueItems = Array.from(groups.values()).map(g => ({ detail: g.representative }))
        setCategorizingStatus(
          `Sending ${uniqueItems.length.toLocaleString('id-ID')} unique descriptions to AI` +
          (needsAI.length > uniqueItems.length ? ` (covers ${needsAI.length.toLocaleString('id-ID')} transactions)` : '') +
          '…'
        )

        const payload = {
          transactions: uniqueItems,
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

        if (data.categories?.length !== uniqueItems.length) {
          throw new Error(`Expected ${uniqueItems.length} categories, got ${data.categories?.length}`)
        }

        // Apply each AI result back to all transactions sharing that normalized description
        const groupsArray = Array.from(groups.values())
        groupsArray.forEach((group, i) => {
          const category = data.categories[i] as string
          group.indices.forEach(({ si, ti }) => {
            updated[si].transactions[ti].category = category
          })
          if (category !== 'Uncategorized') {
            aiCount += group.indices.length
          } else {
            remaining.push({ detail: group.representative, amount: group.amount })
          }
        })
      }

      localStorage.setItem('fintrackr', JSON.stringify(updated))
      setCategorizedResult({
        total: uncategorized.length,
        learnedCount,
        aiCount,
        success: learnedCount + aiCount,
        remaining,
      })
      reloadStatements()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsCategorizing(false)
      setCategorizingStatus(null)
    }
  }, [reloadStatements])

  const getInsights = useCallback(
    async (transactions: any[], year?: string, month?: string, force = false) => {
      const cacheKey = `fintrackr_insights_${year || 'all'}_${month || 'all'}`
      if (!force) {
        const cached = sessionStorage.getItem(cacheKey)
        if (cached) {
          setInsights(cached)
          return
        }
      } else {
        sessionStorage.removeItem(cacheKey)
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
    categorizingStatus,
    isGeneratingInsights,
    error,
    insights,
    categorizedResult,
    categorizeAll,
    getInsights,
    clearCategorizedResult: () => setCategorizedResult(null),
    clearError: () => setError(null),
    // Clears display + sessionStorage cache (used by the Clear button)
    clearInsights: () => {
      const keys = Object.keys(sessionStorage).filter((k) =>
        k.startsWith('fintrackr_insights_')
      )
      keys.forEach((k) => sessionStorage.removeItem(k))
      setInsights(null)
    },
    // Clears display only — cache stays so switching back reloads instantly
    resetInsights: () => setInsights(null),
  }
}
