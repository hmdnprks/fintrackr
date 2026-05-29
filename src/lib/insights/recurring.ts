/* eslint-disable @typescript-eslint/no-explicit-any */

export type RecurringSuggestion = {
  normalizedDetail: string
  occurrences: number
  totalAmount: number
  sampleDetail: string
}

export function normalizeDetail(detail: string) {
  return detail
    .toUpperCase()
    .replace(/\d+/g, '')       // remove numbers
    .replace(/[^A-Z\s]/g, '')  // remove symbols
    .replace(/\s+/g, ' ')      // collapse spaces
    .trim()
}

export function detectRecurringUncategorized(
  transactions: any[],
  minOccurrences = 2
): RecurringSuggestion[] {

  const map: Record<string, {
    count: number
    totalAmount: number
    sampleDetail: string
  }> = {}

  for (const tx of transactions) {
    if (tx.category !== 'Uncategorized') continue

    const key = normalizeDetail(tx.detail)
    if (!key) continue

    if (!map[key]) {
      map[key] = {
        count: 0,
        totalAmount: 0,
        sampleDetail: tx.detail
      }
    }

    map[key].count += 1
    map[key].totalAmount += tx.amount || 0
  }

  return Object.entries(map)
    .filter(([_, value]) => value.count >= minOccurrences)
    .map(([normalizedDetail, value]) => ({
      normalizedDetail,
      occurrences: value.count,
      totalAmount: value.totalAmount,
      sampleDetail: value.sampleDetail
    }))
    .sort((a, b) => b.occurrences - a.occurrences)
}

