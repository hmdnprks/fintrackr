/* eslint-disable @typescript-eslint/no-explicit-any */

const CATEGORIES = [
  'Income', 'Food & Dining', 'Groceries', 'Shopping',
  'Services', 'Transportation', 'Health & Medical',
  'Entertainment', 'Education', 'Housing', 'Insurance',
  'Bank Charges', 'Transfer', 'Uncategorized',
] as const

type DeepSeekMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

// ─── Categorization ──────────────────────────────────────────────────────────

const CATEGORIZE_PROMPT = `You are a transaction categorizer for Indonesian bank statements (Bank Mandiri).
Categorize each transaction into exactly one of: ${CATEGORIES.join(', ')}.

Rules:
- "Income": money received — salary, transfers in (DARI, CR), interest (Bunga, Gaji)
- "Food & Dining": restaurants, cafes, food delivery (GoFood, GrabFood, Warung, Kopi, Resto)
- "Groceries": supermarkets and minimarkets (Alfamart, Indomaret, Superindo, Hypermart, Carrefour, QRIS at stores)
- "Shopping": e-commerce and retail (Tokopedia, Shopee, Lazada, Blibli, Bukalapak, Zalora)
- "Transportation": ride-hailing, fuel, toll, parking (Gojek, Grab, inDrive, Pertamina, KAI, Transjakarta, Toll, Parkir)
- "Housing": rent, electricity, water, internet (PLN, PDAM, Sewa, Indihome, Biznet, Kontrakan, Listrik)
- "Services": telco, subscriptions, travel bookings (Telkomsel, Indosat, XL, Tri, Traveloka, Tiket.com)
- "Health & Medical": pharmacy, clinic, hospital (Apotek, Kimia Farma, K24, Klinik, Halodoc, Alodokter)
- "Entertainment": streaming, games (Netflix, Spotify, YouTube, Disney, Steam, Vidio)
- "Education": courses, books, training (Udemy, Coursera, buku)
- "Insurance": insurance premiums (Asuransi, Premi)
- "Bank Charges": admin fees, ATM fees, penalties (Biaya Adm, Biaya Transfer, Denda)
- "Transfer": transfers between accounts, e-wallets, and credit card bill payments (GoPay, OVO, DANA, ShopeePay, LinkAja, KARTU KREDIT, Bayar CC — credit card payments are NOT expenses, they settle a liability)
- "Uncategorized": only if truly unable to determine

Indonesian context: descriptions mix Indonesian and English. QRIS is a QR payment method — use surrounding context to determine the category.

Respond with ONLY a JSON array of category strings, one per transaction in order.
Example: ["Food & Dining", "Shopping", "Income"]`

const BATCH_SIZE = 25

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function categorizeBatch(
  batch: { detail: string }[],
  apiKey: string,
  model: string
): Promise<string[]> {
  const messages: DeepSeekMessage[] = [
    { role: 'system', content: CATEGORIZE_PROMPT },
    { role: 'user',   content: JSON.stringify(batch.map((t) => t.detail)) },
  ]

  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, temperature: 0.1, max_tokens: 4096 }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`DeepSeek API error: ${res.status} - ${err}`)
  }

  const json = await res.json()
  let content: string = json.choices?.[0]?.message?.content || ''

  content = content
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```\s*$/g, '')
    .trim()

  const parsed = JSON.parse(content)
  if (!Array.isArray(parsed)) {
    throw new Error(`Expected JSON array, got ${typeof parsed}`)
  }

  // If AI returned fewer items than sent, retry for the missing ones
  if (parsed.length < batch.length) {
    const missing = batch.slice(parsed.length)
    const filled = await categorizeBatch(missing, apiKey, model)
    return [...parsed, ...filled].map((c: string) =>
      CATEGORIES.includes(c as any) ? c : 'Uncategorized'
    )
  }

  return parsed.slice(0, batch.length).map((c: string) =>
    CATEGORIES.includes(c as any) ? c : 'Uncategorized'
  )
}

async function categorizeBatchWithRetry(
  batch: { detail: string }[],
  apiKey: string,
  model: string,
  maxRetries = 3
): Promise<string[]> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await categorizeBatch(batch, apiKey, model)
    } catch (err: any) {
      const isRateLimit = err.message?.includes('429')
      const isLast = attempt === maxRetries - 1
      if (isRateLimit && !isLast) {
        await sleep(1000 * Math.pow(2, attempt))  // 1s, 2s, 4s
        continue
      }
      throw err
    }
  }
  throw new Error('Max retries exceeded')
}

// Sequential (not parallel) to avoid rate limit bursts
export async function categorizeWithAI(
  transactions: { detail: string; amount: number; type: string }[],
  apiKey: string,
  model = 'deepseek-chat'
): Promise<string[]> {
  const batches = chunkArray(transactions, BATCH_SIZE)
  const results: string[][] = []

  for (let i = 0; i < batches.length; i++) {
    const result = await categorizeBatchWithRetry(
      batches[i].map((t) => ({ detail: t.detail })),
      apiKey,
      model
    )
    results.push(result)
    // Small pause between batches to be gentle on the API
    if (i < batches.length - 1) await sleep(300)
  }

  return results.flat()
}

// ─── Insights ────────────────────────────────────────────────────────────────

function formatIDRShort(amount: number): string {
  if (!amount || isNaN(amount)) return 'Rp 0'
  if (amount >= 1_000_000) return `Rp ${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000)     return `Rp ${(amount / 1_000).toFixed(0)}K`
  return `Rp ${amount}`
}

// These are financial movements, not actual spending — exclude from spending analysis
const EXCLUDE_FROM_SPENDING = new Set(['Transfer', 'Bank Charges'])

function aggregateTransactions(
  transactions: { detail: string; amount: number; type: string; category: string }[],
  period: string
) {
  const income   = transactions.filter(t => t.type === 'credit').reduce((s, t) => s + (t.amount || 0), 0)
  const allDebit = transactions.filter(t => t.type === 'debit').reduce((s, t) => s + (t.amount || 0), 0)

  // Separate real spending from transfers/bank charges
  const byCat: Record<string, { amount: number; count: number }> = {}
  let transferTotal = 0

  for (const t of transactions) {
    if (t.type !== 'debit') continue
    const cat = t.category || 'Uncategorized'
    const amt = t.amount || 0
    if (EXCLUDE_FROM_SPENDING.has(cat)) {
      transferTotal += amt
      continue
    }
    if (!byCat[cat]) byCat[cat] = { amount: 0, count: 0 }
    byCat[cat].amount += amt
    byCat[cat].count++
  }

  const realExpenses = allDebit - transferTotal
  const net = income - allDebit

  const categoryBreakdown = Object.entries(byCat)
    .sort((a, b) => b[1].amount - a[1].amount)
    .map(([cat, { amount, count }]) => ({
      category: cat,
      amount: formatIDRShort(amount),
      count,
      pct: realExpenses > 0 ? Math.round((amount / realExpenses) * 100) : 0,
    }))

  const topExpenses = [...transactions]
    .filter(t => t.type === 'debit' && !EXCLUDE_FROM_SPENDING.has(t.category))
    .sort((a, b) => (b.amount || 0) - (a.amount || 0))
    .slice(0, 5)
    .map(t => `${t.detail}: ${formatIDRShort(t.amount)} (${t.category})`)

  return {
    period,
    currency: 'IDR (Indonesian Rupiah)',
    income:        formatIDRShort(income),
    realExpenses:  formatIDRShort(realExpenses),
    transfers:     transferTotal > 0 ? formatIDRShort(transferTotal) : null,
    net:           formatIDRShort(Math.abs(net)),
    netDirection:  net >= 0 ? 'saved' : 'overspent',
    savingsRate:   income > 0 ? `${Math.round(((income - allDebit) / income) * 100)}%` : 'N/A',
    transactionCount: transactions.length,
    categoryBreakdown,
    topExpenses,
  }
}

const INSIGHTS_PROMPT = `You are a personal finance advisor for an Indonesian user.
Currency is IDR (Indonesian Rupiah). Format amounts as "Rp X.XXX.XXX" when giving exact figures.

The data uses realExpenses (actual spending on goods/services) separate from transfers (credit card payments, e-wallet top-ups, bank charges). Focus your analysis on realExpenses and categoryBreakdown — not transfers.

Respond with exactly 4 bullet points, each on its own line, starting with "• ":
• **Top spending:** [category] — [amount] ([pct]% of real expenses). [one sentence observation]
• **Watch out:** [specific concern with actual numbers — overspending category, large transaction, or negative savings rate]
• **Good news:** [one genuinely positive thing — if savings rate is very negative, replace with a second concern]
• **Action for next month:** [one concrete suggestion with a specific target amount from the data]

Rules:
- Base all observations on realExpenses and categoryBreakdown, not the transfers field
- Use actual numbers, never generic advice
- Be direct — like a trusted friend, not a financial report
- If income is missing or zero, focus only on spending patterns
- Indonesian context: food Rp 20K–100K/meal, ride Rp 15K–50K, groceries Rp 500K–1.5M/month
- Each bullet: 1–2 sentences only`

export async function generateInsights(
  transactions: { detail: string; amount: number; type: string; category: string }[],
  apiKey: string,
  model = 'deepseek-chat',
  period = 'this period'
): Promise<string> {
  const summary = aggregateTransactions(transactions, period)

  const messages: DeepSeekMessage[] = [
    { role: 'system', content: INSIGHTS_PROMPT },
    { role: 'user',   content: JSON.stringify(summary) },
  ]

  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, temperature: 0.1, max_tokens: 1024 }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`DeepSeek API error: ${res.status} - ${err}`)
  }

  const json = await res.json()
  return json.choices?.[0]?.message?.content || ''
}

// ─── Windfall Allocation ─────────────────────────────────────────────────────

export type WindfallAllocation = {
  destination: string
  amount: number
  reason: string
}

export type WindfallResult = {
  summary: string
  allocations: WindfallAllocation[]
  leftover: number
  leftoverAdvice: string
}

export type WindfallContext = {
  windfall: { amount: number; type: string }
  income:   { avgMonthly: number }
  expenses: { avgMonthly: number }
  emergencyFund: {
    currentMonths: number
    targetMonths: number
    gapAmount: number
    accounts: { name: string; institution: string }[]
  }
  assets: {
    totalNetWorth: number
    byType: Record<string, number>
    pockets: {
      name: string
      goalName?: string
      currentValue: number
      goalTarget?: number
      goalDeadline?: string
      gapAmount: number
    }[]
    investments: { name: string; institution: string; currentValue: number; platform?: string }[]
  }
}

const WINDFALL_PROMPT = `You are a personal financial advisor for an Indonesian user. Currency is IDR (Indonesian Rupiah).

The user received a windfall and wants a concrete allocation plan based on their real financial data.

Allocation priorities (in order):
1. Emergency fund — if below 6 months of expenses, top it up first (liquid savings account)
2. Goal pockets with the nearest deadlines and largest gaps
3. Investments — diversify if under-allocated vs net worth
4. Leave a small cash buffer (0.5–1× monthly expense) for near-term spending

Additional rules:
- THR (Tunjangan Hari Raya) context: account for Lebaran spending — keep 20–30% liquid for seasonal expenses
- Round all amounts to the nearest 100,000 IDR
- If windfall is small (< Rp 2M), suggest 1–2 destinations max
- Use the exact asset/pocket names from the context
- Be direct and specific — cite actual numbers and gaps in each reason
- All allocation amounts must sum to ≤ windfall amount; leftover = windfall − sum(allocations)

Respond with ONLY valid JSON, no markdown:
{
  "summary": "one sentence overall rationale",
  "allocations": [
    { "destination": "exact name from context", "amount": number, "reason": "1–2 sentences with specific numbers" }
  ],
  "leftover": number,
  "leftoverAdvice": "one sentence on what to do with any remainder, or empty string if leftover is 0"
}`

export async function generateWindfallAllocation(
  context: WindfallContext,
  apiKey: string,
  model = 'deepseek-chat'
): Promise<WindfallResult> {
  const messages: DeepSeekMessage[] = [
    { role: 'system', content: WINDFALL_PROMPT },
    { role: 'user',   content: JSON.stringify(context) },
  ]

  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, temperature: 0.2, max_tokens: 1024 }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`DeepSeek API error: ${res.status} - ${err}`)
  }

  const json = await res.json()
  let content: string = json.choices?.[0]?.message?.content || ''
  content = content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```\s*$/g, '').trim()

  const parsed = JSON.parse(content)
  if (!parsed.allocations || !Array.isArray(parsed.allocations)) {
    throw new Error('Unexpected response format from AI')
  }

  return parsed as WindfallResult
}

// ─── Budget Suggestions ───────────────────────────────────────────────────────

export type BudgetSuggestion = {
  category: string
  suggested: number
  reason: string
}

const BUDGET_PROMPT = `You are a personal finance advisor for an Indonesian user (currency: IDR).
Based on the average monthly spending history below, suggest a realistic monthly budget limit for each category.

Rules:
- For necessities (Housing, Transportation, Groceries, Health & Medical): suggest 5–10% above the average
- For discretionary spending (Shopping, Entertainment, Food & Dining): suggest at the average or slightly below if high
- For variable essentials (Services, Education, Insurance): match the average
- Round all amounts to the nearest 25,000 IDR
- Skip any category with average below 50,000 IDR
- One concise reason per category (max 10 words), referencing the actual average

Respond with ONLY a JSON array — no markdown, no explanation:
[{"category":"Food & Dining","suggested":1500000,"reason":"10% buffer above your Rp 1.3M average"}]`

export async function generateBudgetSuggestions(
  averages: { category: string; average: number; months: number }[],
  apiKey: string,
  model = 'deepseek-chat'
): Promise<BudgetSuggestion[]> {
  const messages: DeepSeekMessage[] = [
    { role: 'system', content: BUDGET_PROMPT },
    { role: 'user',   content: JSON.stringify(
      averages.map((a) => ({
        category: a.category,
        averageMonthly: formatIDRShort(a.average),
        monthsOfData: a.months,
      }))
    )},
  ]

  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, temperature: 0.1, max_tokens: 1024 }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`DeepSeek API error: ${res.status} - ${err}`)
  }

  const json   = await res.json()
  let content: string = json.choices?.[0]?.message?.content || ''
  content = content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```\s*$/g, '').trim()

  const parsed = JSON.parse(content)
  if (!Array.isArray(parsed)) throw new Error('Expected JSON array from budget suggestions')

  return parsed.filter(
    (s: any) => s.category && typeof s.suggested === 'number' && s.suggested > 0
  )
}
