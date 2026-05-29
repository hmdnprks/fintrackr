/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { categorizeWithAI, generateInsights } from '@/lib/categorizer/aiCategorizer'

export async function POST(req: NextRequest) {
  try {
    const { transactions, type } = await req.json()

    const apiKey = process.env.DEEPSEEK_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'DEEPSEEK_API_KEY not configured' },
        { status: 500 }
      )
    }

    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No transactions provided' },
        { status: 400 }
      )
    }

    if (type === 'insights') {
      const insights = await generateInsights(transactions, apiKey)
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
