/* eslint-disable @typescript-eslint/no-explicit-any */

export type RecurringSuggestion = {
  normalizedDetail: string
  occurrences: number
  totalAmount: number
  sampleDetail: string
  transactionIndexes: number[]
}

export function normalizeDetail(detail: string) {
  return detail
    .toUpperCase()
    .replace(/\d+/g, '')       // remove numbers
    .replace(/[^A-Z\s]/g, '')  // remove symbols
    .replace(/\s+/g, ' ')      // collapse spaces
    .trim()
}

// Returns true only when it is safe to offer "apply to all similar":
// 1. The normalized key must be long enough to be specific (≥ MIN_KEY_LENGTH chars)
// 2. The two raw descriptions must share at least one alpha token of ≥ 3 chars
//    — this catches cases where two descriptions normalize to the same short key
//    but are clearly different merchants (e.g. "JPN-APPLE" vs "JPN-NETFLIX")
export function isSafeSimilarityMatch(a: string, b: string, debug = false): boolean {
  const longNums = (s: string): string[] => s.match(/\d{12,}/g) ?? []
  const numsA = longNums(a)
  const numsB = longNums(b)

  if (debug) {
    console.log('[similarity] a:', a)
    console.log('[similarity] b:', b)
    console.log('[similarity] numsA (12+digits):', numsA)
    console.log('[similarity] numsB (12+digits):', numsB)
  }

  if (numsA.length > 0 || numsB.length > 0) {
    const result = numsA.some(n => b.includes(n)) || numsB.some(n => a.includes(n))
    if (debug) console.log('[similarity] numeric path → result:', result)
    return result
  }

  const keyA = normalizeDetail(a)
  const keyB = normalizeDetail(b)
  if (debug) console.log('[similarity] alpha path — keyA:', keyA, 'keyB:', keyB)
  if (keyA !== keyB || keyA.length < MIN_KEY_LENGTH) {
    if (debug) console.log('[similarity] alpha path → no match (keys differ or too short)')
    return false
  }
  const tokens = (s: string) =>
    s.toUpperCase().replace(/[^A-Z\s]/g, ' ').split(/\s+/).filter(t => t.length >= 3)
  const setA = new Set(tokens(a))
  const result = tokens(b).some(t => setA.has(t))
  if (debug) console.log('[similarity] alpha shared tokens → result:', result)
  return result
}

// Minimum chars a normalized key must have to be a safe grouping key.
// Keys shorter than this (e.g. "JPN", "UBP", "VAP") are too generic and
// would falsely group unrelated transactions from different merchants.
const MIN_KEY_LENGTH = 5

export function detectRecurringUncategorized(
  transactions: any[],
  minOccurrences = 2
): RecurringSuggestion[] {

  const map: Record<string, {
    count: number
    totalAmount: number
    sampleDetail: string
    indexes: number[]
  }> = {}

  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i]
    if (tx.category !== 'Uncategorized') continue

    const alphaKey = normalizeDetail(tx.detail)
    // Use alpha key when long enough; otherwise fall back to first 10+ digit numeric sequence
    const longNums = tx.detail.match(/\d{10,}/g) ?? []
    const key = alphaKey.length >= MIN_KEY_LENGTH ? alphaKey : (longNums[0] ?? '')
    if (!key) continue

    if (!map[key]) {
      map[key] = {
        count: 0,
        totalAmount: 0,
        sampleDetail: tx.detail,
        indexes: [],
      }
    }

    map[key].count += 1
    map[key].totalAmount += tx.amount || 0
    map[key].indexes.push(i)
  }

  return Object.entries(map)
    .filter(([_, value]) => value.count >= minOccurrences)
    .map(([normalizedDetail, value]) => ({
      normalizedDetail,
      occurrences: value.count,
      totalAmount: value.totalAmount,
      sampleDetail: value.sampleDetail,
      transactionIndexes: value.indexes,
    }))
    .sort((a, b) => b.occurrences - a.occurrences)
}

