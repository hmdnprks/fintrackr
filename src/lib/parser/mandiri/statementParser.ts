// src/lib/parser/mandiriStatementParser.ts

export type AccountSummary = {
  accountNumber: string
  productName: string
  branch: string
  period: string
  currency: string
  balance: number
}

export type Transaction = {
  transactionDate: string
  valutaDate?: string
  detail: string
  amount?: number
  type?: 'debit' | 'credit'
  balance?: number
}

type Row = {
  y: number
  items: { text: string; x: number }[]
}

function parseNumber(value?: string) {
  if (!value) return undefined
  return Number(value.replace(/,/g, '').trim())
}

export function parseMandiriStatement(rows: Row[]) {
  const accountSummary = parseAccountSummary(rows)
  const transactions = parseTransactions(rows)

  // 🔥 Sort by transaction date ascending
  const sortedTransactions = transactions.sort((a, b) => {
    const dateA = buildFullDate(a.transactionDate, accountSummary.period)
    const dateB = buildFullDate(b.transactionDate, accountSummary.period)

    return dateA.getTime() - dateB.getTime()
  })

  return {
    accountSummary,
    transactions: sortedTransactions,
  }
}

/* ===========================
   ACCOUNT SUMMARY PARSER
=========================== */

export function parseAccountSummary(rows: Row[]): AccountSummary {
  // Find row that contains account number
  const startIndex = rows.findIndex(row =>
    row.items.some(i => i.x < 3 && /\d{3}-\d{2}-\d+/.test(i.text))
  )

  if (startIndex === -1) {
    throw new Error('Account summary not found')
  }

  const row1 = rows[startIndex]
  const row2 = rows[startIndex + 1]
  const row3 = rows[startIndex + 2]

  const accountNumber =
    row1.items.find(i => i.x < 3)?.text.trim() ?? ''

  // Product Name (x 7–14)
  const productLine1 =
    row1.items.find(i => i.x >= 7 && i.x < 14)?.text.trim() ?? ''

  const productLine2 =
    row2?.items.find(i => i.x >= 7 && i.x < 14)?.text.trim() ?? ''

  const productName =
    (productLine1 + ' ' + productLine2).trim()

  // Branch (x 14–24)
  const branch =
    row1.items.find(i => i.x >= 14 && i.x < 24)?.text.trim() ?? ''

  // Period (x 24–29)
  const periodLine1 =
    row1.items.find(i => i.x >= 24 && i.x < 29)?.text.trim() ?? ''

  const periodLine2 =
    row2?.items.find(i => i.x >= 24 && i.x < 29)?.text.trim() ?? ''

  const period =
    (periodLine1 + ' ' + periodLine2).trim()

  // Currency (x 29–35)
  const currencyLine1 =
    row1.items.find(i => i.x >= 29 && i.x < 35)?.text.trim() ?? ''

  const currencyLine2 =
    row2?.items.find(i => i.x >= 29 && i.x < 35)?.text.trim() ?? ''

  const currencyLine3 =
    row3?.items.find(i => i.x >= 29 && i.x < 35)?.text.trim() ?? ''

  const currency =
    (currencyLine1 + ' ' + currencyLine2 + ' ' + currencyLine3).trim()

  // Balance (x > 35)
  const balance =
    parseNumber(row1.items.find(i => i.x > 35)?.text) ?? 0

  return {
    accountNumber,
    productName,
    branch,
    period,
    currency,
    balance,
  }
}

/* ===========================
   TRANSACTION PARSER
=========================== */

export function parseTransactions(rows: Row[]): Transaction[] {
  const transactions: Transaction[] = []
  let current: Transaction | null = null

  for (const row of rows) {
    const items = row.items

    const dateItem = items.find(i => i.x < 3)

    // NEW TRANSACTION
    if (dateItem && /^\d{2}\/\d{2}/.test(dateItem.text)) {
      if (current) transactions.push(current)

      const valuta = items.find(i => i.x >= 5 && i.x < 8)
      const detail = items.find(i => i.x >= 8 && i.x < 25)
      const amountItem = items.find(i => i.x >= 27 && i.x < 31)
      const debitMarker = items.find(i => i.x >= 31 && i.x < 34)
      const balanceItem = items.find(i => i.x > 34)

      current = {
        transactionDate: dateItem.text.trim(),
        valutaDate: valuta?.text.trim(),
        detail: detail?.text.trim() ?? '',
        amount: parseNumber(amountItem?.text),
        type: debitMarker?.text.trim() === 'D' ? 'debit' : 'credit',
        balance: parseNumber(balanceItem?.text),
      }
    }

    // CONTINUATION ROW
    else if (current) {
      const continuationText = items
        .filter(i => i.x >= 8 && i.x < 25)
        .map(i => i.text.trim())
        .join(' ')

      if (continuationText) {
        current.detail += ' ' + continuationText
      }
    }
  }

  if (current) transactions.push(current)

  return transactions.filter(
    (tx) =>
      !tx.detail.trim().toUpperCase().includes('SALDO AWAL') &&
      tx.amount !== undefined &&
      !isNaN(tx.amount)
  )
}

function buildFullDate(dateStr: string, period: string) {
  // dateStr = "03/12"
  // period = "1/12/25 s/d 31/12/25"

  const yearMatch = period.match(/\d{2}\/\d{2}\/(\d{2})$/)

  const year = yearMatch ? `20${yearMatch[1]}` : new Date().getFullYear()

  const [day, month] = dateStr.split('/')

  return new Date(Number(year), Number(month) - 1, Number(day))
}
