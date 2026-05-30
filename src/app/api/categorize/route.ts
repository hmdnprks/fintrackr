/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { categorizeWithAI, generateInsights, generateBudgetSuggestions, generateWindfallAllocation, generateRebalancingSuggestions } from '@/lib/categorizer/aiCategorizer'

export async function POST(req: NextRequest) {
  try {
    const { transactions, type, period, averages, context, rebalanceContext, apiKey: clientKey } = await req.json()

    // Env var takes priority (server operator); client-provided key is fallback (production users)
    const apiKey = process.env.DEEPSEEK_API_KEY || clientKey
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'No DeepSeek API key configured. Add one in Settings.' },
        { status: 400 }
      )
    }

    if (type === 'rebalance') {
      if (!rebalanceContext) {
        return NextResponse.json({ success: false, error: 'No asset context provided.' }, { status: 400 })
      }
      const result = await generateRebalancingSuggestions(rebalanceContext, apiKey)
      return NextResponse.json({ success: true, result })
    }

    if (type === 'windfall-allocation') {
      if (!context) {
        return NextResponse.json({ success: false, error: 'No financial context provided.' }, { status: 400 })
      }
      const result = await generateWindfallAllocation(context, apiKey)
      return NextResponse.json({ success: true, result })
    }

    // budget-suggestions uses averages, not transactions — handle before the transactions guard
    if (type === 'budget-suggestions') {
      if (!averages || !Array.isArray(averages) || averages.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No spending history available to generate suggestions.' },
          { status: 400 }
        )
      }
      const suggestions = await generateBudgetSuggestions(averages, apiKey)
      return NextResponse.json({ success: true, suggestions })
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
