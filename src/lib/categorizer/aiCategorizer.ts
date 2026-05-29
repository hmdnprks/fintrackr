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

const SYSTEM_PROMPT = `You are a transaction categorizer. Categorize each transaction into exactly one of: ${CATEGORIES.join(', ')}.

Rules:
- "Income" for any money coming in (salary, transfer in, interest)
- "Food & Dining" for restaurants, cafes, food delivery
- "Groceries" for supermarkets, minimarkets, grocery stores
- "Shopping" for retail, e-commerce, online shopping
- "Services" for bills, subscriptions, utilities, insurance
- "Transportation" for fuel, tolls, parking, ride-hailing
- "Health & Medical" for pharmacy, doctor, hospital
- "Entertainment" for streaming, games, hobbies
- "Education" for courses, books, training
- "Housing" for rent, electricity, water, internet
- "Insurance" for health, vehicle, life insurance premiums
- "Bank Charges" for admin fees, ATM fees, penalties
- "Transfer" for transfers between accounts
- "Uncategorized" only if truly unable to determine

Respond with ONLY a JSON array of category strings, one per transaction in order. Example: ["Food & Dining", "Shopping", "Income"]`

const BATCH_SIZE = 25

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

async function categorizeBatch(
  batch: { detail: string }[],
  apiKey: string,
  model: string
): Promise<string[]> {
  const userPrompt = JSON.stringify(batch.map((t) => t.detail))

  const messages: DeepSeekMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ]

  const res = await fetch(
    'https://api.deepseek.com/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.1,
        max_tokens: 4096,
      }),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`DeepSeek API error: ${res.status} - ${err}`)
  }

  const json = await res.json()
  let content = json.choices?.[0]?.message?.content || ''

  content = content
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```\s*$/g, '')
    .trim()

  const parsed = JSON.parse(content)

  if (!Array.isArray(parsed)) {
    throw new Error(
      `Expected JSON array, got ${typeof parsed}: ${content.slice(0, 200)}`
    )
  }

  if (parsed.length < batch.length) {
    const missing = batch.slice(parsed.length)
    console.log(
      `[AI Categorize] Batch got ${parsed.length}/${batch.length}, retrying ${missing.length} missing`
    )
    const filled = await categorizeBatch(missing, apiKey, model)
    return [...parsed, ...filled].map((c: string) =>
      CATEGORIES.includes(c as any) ? c : 'Uncategorized'
    )
  }

  return parsed.slice(0, batch.length).map((c: string) =>
    CATEGORIES.includes(c as any) ? c : 'Uncategorized'
  )
}

export async function categorizeWithAI(
  transactions: { detail: string; amount: number; type: string }[],
  apiKey: string,
  model = 'deepseek-chat'
): Promise<string[]> {
  const batches = chunkArray(transactions, BATCH_SIZE)
  console.log(
    `[AI Categorize] ${transactions.length} transactions, ${batches.length} batches of ${BATCH_SIZE}`
  )

  const results = await Promise.all(
    batches.map((batch, i) => {
      console.log(
        `[AI Categorize] Sending batch ${i + 1}/${batches.length} (${
          batch.length
        } txs)`
      )
      return categorizeBatch(
        batch.map((t) => ({ detail: t.detail })),
        apiKey,
        model
      )
    })
  )

  return results.flat()
}

export async function generateInsights(
  transactions: { detail: string; amount: number; type: string; category: string }[],
  apiKey: string,
  model = 'deepseek-chat'
): Promise<string> {
  const systemPrompt = `You are a personal finance analyst. Analyze these transactions and provide:
1. Top spending categories this month
2. Notable changes or patterns
3. Money-saving suggestions
4. Any unusual transactions

Keep it concise, 3-5 bullet points. Be direct and helpful.`

  const userPrompt = JSON.stringify(
    transactions.map((t) => ({
      detail: t.detail,
      amount: t.amount,
      type: t.type,
      category: t.category,
    }))
  )

  const messages: DeepSeekMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]

  const res = await fetch(
    'https://api.deepseek.com/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.3,
        max_tokens: 2048,
      }),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`DeepSeek API error: ${res.status} - ${err}`)
  }

  const json = await res.json()
  return json.choices?.[0]?.message?.content || ''
}
