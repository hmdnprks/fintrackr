/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { messages, apiKey, transactionContext } = await req.json()

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'API key not provided' },
        { status: 400 }
      )
    }

    const systemPrompt = `You are a personal finance assistant integrated into FinTrackr. The user's transaction data is provided below. Answer questions about their spending, categorize transactions, suggest budgets, and give financial advice based on this data.

IMPORTANT: Format all currency amounts in Indonesian Rupiah format — use dots as thousand separators and comma for decimals. Example: "Rp 22.569.082" NOT "Rp 22,569,082".

Transaction Data:
${JSON.stringify(transactionContext, null, 2)}

Be concise, helpful, and specific to their data. If asked about something outside the transaction data, politely steer back to their finances.`

    const res = await fetch(
      'https://api.deepseek.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages,
          ],
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
    const content = json.choices?.[0]?.message?.content || ''

    return NextResponse.json({ success: true, message: content })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    )
  }
}
