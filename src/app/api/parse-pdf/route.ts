/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import {
  parseAccountSummary,
  parseTransactions,
} from '@/lib/parser/mandiri/statementParser'
import { categorizeTransaction } from '@/lib/categorizer/mandiri/transactionCategorizer';


export const runtime = 'nodejs'

type Row = {
  y: number
  items: { text: string; x: number }[]
}

function buildSortedRows(pageRows: Record<number, any[]>): Row[] {
  return Object.keys(pageRows)
    .map(Number)
    .sort((a, b) => a - b)
    .map((y) => ({
      y,
      items: pageRows[y].sort((a: any, b: any) => a.x - b.x),
    }))
}

export async function POST(req: NextRequest) {
  try {
    const { PdfReader } = await import('pdfreader')

    const formData = await req.formData()
    const file = formData.get('file') as File
    const password = formData.get('password') as string

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file uploaded' },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    const rowsByPage: Record<number, Record<number, any[]>> = {}
    let currentPage = 0

    await new Promise<void>((resolve, reject) => {
      new PdfReader({ password }).parseBuffer(buffer, (err: any, item: any) => {
        if (err) return reject(err)

        if (!item) {
          resolve()
        } else if (item.page) {
          currentPage = item.page
          if (!rowsByPage[currentPage]) {
            rowsByPage[currentPage] = {}
          }
        } else if (item.text) {
          const y = Math.round(item.y * 100) / 100

          if (!rowsByPage[currentPage][y]) {
            rowsByPage[currentPage][y] = []
          }

          rowsByPage[currentPage][y].push({
            text: item.text,
            x: item.x,
          })
        }
      })
    })

    // 🔥 PAGE 3 contains summary + first transaction section
    const page3Rows = rowsByPage[3]
      ? buildSortedRows(rowsByPage[3])
      : []

    if (!page3Rows.length) {
      throw new Error('Page 3 not found or empty')
    }

    // 🔍 Find transaction table header row
    const transactionHeaderIndex = page3Rows.findIndex((row) =>
      row.items.some((i) =>
        i.text.includes('Rincian Transaksi')
      )
    )

    if (transactionHeaderIndex === -1) {
      throw new Error('Transaction header not found on page 3')
    }

    // ✅ Split summary & transaction rows
    const summaryRows = page3Rows.slice(0, transactionHeaderIndex)
    const transactionRowsFromPage3 = page3Rows.slice(
      transactionHeaderIndex + 1
    )

    // 🔥 Collect additional transaction pages (4+)
    const additionalTransactionRows = Object.keys(rowsByPage)
      .map(Number)
      .filter((page) => page > 3)
      .flatMap((page) => buildSortedRows(rowsByPage[page]))

    const allTransactionRows = [
      ...transactionRowsFromPage3,
      ...additionalTransactionRows,
    ]

    // 🎯 Parse
    const accountSummary = parseAccountSummary(summaryRows)
    const transactions = parseTransactions(allTransactionRows)


    const enrichedTransactions = transactions.map((tx) => ({
      ...tx,
      category: categorizeTransaction(tx.detail, tx.type),
    }))

    return NextResponse.json({
      success: true,
      accountSummary,
      transactions: enrichedTransactions,
    })
  } catch (err: any) {
    console.error(err)
    const message = err?.parserError || ''

    // 🔐 Handle incorrect password explicitly
    if (message.includes('PasswordException')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Incorrect PDF password',
          code: 'INVALID_PASSWORD',
        },
        { status: 401 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 400 }
    )
  }
}
