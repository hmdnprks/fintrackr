/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { categorizeWithAI, generateInsights, generateBudgetSuggestions } from '@/lib/categorizer/aiCategorizer'

export async function POST(req: NextRequest) {
  try {
    const { transactions, type, period, averages, apiKey: clientKey } = await req.json()

    // Env var takes priority (server operator); client-provided key is fallback (production users)
    const apiKey = process.env.DEEPSEEK_API_KEY || clientKey
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'No DeepSeek API key configured. Add one in Settings.' },
        { status: 400 }
      )
    }

    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No transactions provided' },
        { status: 400 }
      )
    }

    if (type === 'insights') {
      const insights = await generateInsights(transactions, apiKey, 'deepseek-chat', period)
      return NextResponse.json({ success: true, insights })
    }

    if (type === 'budget-suggestions') {
      const suggestions = await generateBudgetSuggestions(averages, apiKey)
      return NextResponse.json({ success: true, suggestions })
    }

    const categories = await categorizeWithAI(transactions, apiKey)
    return NextResponse.json({ success: true, categories })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    )
  }
}
