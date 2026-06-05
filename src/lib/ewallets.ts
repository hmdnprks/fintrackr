/* eslint-disable @typescript-eslint/no-explicit-any */
import { getLabelKey, getDescAmountLabelKey, getNormLabelKey } from '@/lib/insights/recurring'

export type EWalletCatalogEntry = {
  name: string
  emoji: string
  logo?: string           // path relative to /public
  keywords: string[]      // matched against raw description (uppercased)
  color: 'green' | 'purple' | 'orange' | 'blue' | 'red' | 'teal'
}

export const EWALLET_CATALOG: EWalletCatalogEntry[] = [
  { name: 'GoPay',     emoji: '🟢', logo: '/ewallets/gopay.png',     keywords: ['GOPAY', 'GO-PAY'],                 color: 'green'  },
  { name: 'OVO',       emoji: '🟣', logo: '/ewallets/ovo.png',       keywords: ['OVO'],                             color: 'purple' },
  { name: 'ShopeePay', emoji: '🟠', logo: '/ewallets/shopeepay.png', keywords: ['SHOPEEPAY', 'SHOPEE PAY', 'SPAY'], color: 'orange' },
  { name: 'DANA',      emoji: '🔵', logo: '/ewallets/dana.png',      keywords: ['DANA'],                            color: 'blue'   },
  { name: 'LinkAja',   emoji: '🔴', logo: '/ewallets/linkaja.png',   keywords: ['LINKAJA', 'LINK AJA'],             color: 'red'    },
  { name: 'GrabPay',   emoji: '🟩',                                   keywords: ['GRABPAY', 'GRAB-PAY'],             color: 'teal'   },
]

export type EWalletMonthlyData = {
  monthKey: string   // 'YYYY-MM'
  total: number
}

export type EWalletSummary = {
  wallet: EWalletCatalogEntry
  currentMonthTotal: number
  priorMonthTotal: number
  monthlyHistory: EWalletMonthlyData[]  // all months, ascending
  // Search term for go-to-transactions: wallet name lowercase works for both
  // keyword-matched (normalizeDetail contains it) and label-matched transactions
  searchKeyword: string
}

function matchWalletByDesc(detail: string): EWalletCatalogEntry | null {
  const upper = detail.toUpperCase()
  for (const entry of EWALLET_CATALOG) {
    if (entry.keywords.some(kw => upper.includes(kw))) return entry
  }
  return null
}

function matchWalletByLabel(label: string): EWalletCatalogEntry | null {
  const words = label.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)
  for (const entry of EWALLET_CATALOG) {
    if (words.includes(entry.name.toLowerCase())) return entry
  }
  return null
}

function resolveLabel(
  detail: string,
  amount: number,
  labels: Record<string, string>
): string | undefined {
  const lkeyExact   = getLabelKey(detail)
  const lkeyMid     = getDescAmountLabelKey(detail, amount)
  const lkeyGeneral = getNormLabelKey(detail)
  return (lkeyExact   ? labels[lkeyExact]   : undefined)
      ?? (lkeyMid     ? labels[lkeyMid]     : undefined)
      ?? (lkeyGeneral ? labels[lkeyGeneral] : undefined)
}

export function detectEWalletTopups(
  transactions: any[],
  referenceMonthKey?: string,
  transactionLabels: Record<string, string> = {}
): EWalletSummary[] {
  const walletMonths: Record<string, Record<string, number>> = {}

  for (const tx of transactions) {
    if (tx.type !== 'debit') continue

    // Label-only: only count transactions the user has explicitly labeled as a wallet
    const label = resolveLabel(tx.detail ?? '', tx.amount ?? 0, transactionLabels)
    if (!label) continue
    const match = matchWalletByLabel(label)
    if (!match) continue

    const d: Date = tx.fullDate instanceof Date ? tx.fullDate : new Date(tx.transactionDate)
    if (isNaN(d.getTime())) continue
    const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

    if (!walletMonths[match.name]) walletMonths[match.name] = {}
    walletMonths[match.name][mk] = (walletMonths[match.name][mk] ?? 0) + (tx.amount ?? 0)
  }

  let currentKey = referenceMonthKey ?? ''
  if (!currentKey) {
    const allMonths = Object.values(walletMonths).flatMap(m => Object.keys(m)).sort()
    currentKey = allMonths[allMonths.length - 1] ?? ''
  }
  const priorKey = (() => {
    if (!currentKey) return ''
    const [y, m] = currentKey.split('-').map(Number)
    const d = new Date(y, m - 2, 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })()

  return EWALLET_CATALOG
    .filter(w => walletMonths[w.name])
    .map(w => {
      const months = walletMonths[w.name]
      const sortedKeys = Object.keys(months).sort()
      return {
        wallet: w,
        currentMonthTotal: months[currentKey] ?? 0,
        priorMonthTotal:   months[priorKey]   ?? 0,
        monthlyHistory: sortedKeys.map(mk => ({ monthKey: mk, total: months[mk] })),
        searchKeyword: `label:${w.name.toLowerCase()}`,
      }
    })
    .filter(s => s.currentMonthTotal > 0 || s.monthlyHistory.length > 0)
    .sort((a, b) => b.currentMonthTotal - a.currentMonthTotal)
}
