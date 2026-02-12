/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState } from 'react'
import {
  ArrowUpIcon,
  ArrowDownIcon,
  WalletIcon,
  ChartBarIcon,
} from '@heroicons/react/24/solid'

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js'

import { Bar, Pie } from 'react-chartjs-2'
import { saveStatement } from '@/lib/storage'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
)

export default function Home() {
  const [file, setFile] = useState<File | null>(null)
  const [password, setPassword] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function formatIDR(amount: number) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  async function handleSubmit() {
    if (!file) return

    setLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('password', password)

    try {
      const res = await fetch('/api/parse-pdf', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong')
      }

      setResult(data)
    } catch (err: any) {
      setError(err.message)
      setResult(null)
    }

    setLoading(false)
  }


  function handleSave() {
    if (!result) return

    saveStatement(result)
    alert('Statement saved locally.')
  }

  const totalIncome =
    result?.transactions
      ?.filter((t: any) => t.type === 'credit')
      .reduce((sum: number, t: any) => sum + (t.amount || 0), 0) || 0

  const totalExpense =
    result?.transactions
      ?.filter((t: any) => t.type === 'debit')
      .reduce((sum: number, t: any) => sum + (t.amount || 0), 0) || 0

  const overviewData = [
    { name: 'Income', value: totalIncome },
    { name: 'Expense', value: totalExpense },
  ]

  const barData = {
    labels: ['Income', 'Expense'],
    datasets: [
      {
        label: 'Amount',
        data: [totalIncome, totalExpense],
        backgroundColor: ['#22c55e', '#ef4444'],
        borderRadius: 8,
      },
    ],
  }

  const expenseByCategory =
    result?.transactions
      ?.filter((t: any) => t.type === 'debit')
      .reduce((acc: any, tx: any) => {
        const category = tx.category || 'Uncategorized'
        acc[category] = (acc[category] || 0) + (tx.amount || 0)
        return acc
      }, {}) || {}

  const pieData = {
    labels: Object.keys(expenseByCategory),
    datasets: [
      {
        data: Object.values(expenseByCategory),
        backgroundColor: [
          '#ef4444',
          '#f97316',
          '#eab308',
          '#22c55e',
          '#3b82f6',
          '#a855f7',
        ],
      },
    ],
  }



  return (
    <main className="min-h-screen bg-gray-50 py-10 px-6">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            FinTrackr
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Mandiri Statement Parser
          </p>
        </div>

        {/* Upload Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="space-y-4">

            <div className="border-2 border-dashed border-gray-200 p-6 rounded-xl text-center">
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm"
              />
              {file && (
                <p className="text-xs text-gray-500 mt-2">
                  {file.name}
                </p>
              )}
            </div>

            <input
              type="password"
              placeholder="PDF Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-200 p-3 rounded-lg text-sm"
            />

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 transition text-white py-3 rounded-lg text-sm font-medium"
            >
              {loading ? 'Processing...' : 'Parse Statement'}
            </button>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        {result?.success && (
          <>
            {/* Account Summary */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold mb-5">
                Account Summary
              </h2>

              <div className="grid md:grid-cols-4 gap-6 text-sm">
                <div>
                  <p className="text-gray-400">Account</p>
                  <p className="font-medium">
                    {result.accountSummary.accountNumber}
                  </p>
                </div>

                <div>
                  <p className="text-gray-400">Product</p>
                  <p className="font-medium">
                    {result.accountSummary.productName}
                  </p>
                </div>

                <div>
                  <p className="text-gray-400">Period</p>
                  <p className="font-medium">
                    {result.accountSummary.period}
                  </p>
                </div>

                <div>
                  <p className="text-gray-400">Balance</p>
                  <p className="font-semibold text-blue-600">
                    {formatIDR(result.accountSummary.balance)}
                  </p>
                </div>
              </div>
            </div>

            {/* Monthly Overview */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-6">
                <ChartBarIcon className="w-5 h-5 text-blue-600 shrink-0" />
                <h2 className="text-lg font-semibold">
                  Monthly Overview
                </h2>
              </div>

              <div className="grid md:grid-cols-3 gap-6 mb-8">

                <div className="bg-green-50 p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowUpIcon className="w-4 h-4 text-green-600 shrink-0" />
                    <p className="text-xs text-gray-500">Income</p>
                  </div>
                  <p className="text-lg font-semibold text-green-600">
                    {formatIDR(totalIncome)}
                  </p>
                </div>

                <div className="bg-red-50 p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowDownIcon className="w-4 h-4 text-red-600 shrink-0" />
                    <p className="text-xs text-gray-500">Expense</p>
                  </div>
                  <p className="text-lg font-semibold text-red-600">
                    {formatIDR(totalExpense)}
                  </p>
                </div>

                <div className="bg-blue-50 p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <WalletIcon className="w-4 h-4 text-blue-600 shrink-0" />
                    <p className="text-xs text-gray-500">Net</p>
                  </div>
                  <p className="text-lg font-semibold">
                    {formatIDR(totalIncome - totalExpense)}
                  </p>
                </div>
              </div>

              {/* Compact Bar Chart */}
              <div className="h-56">
                <Bar
                  data={barData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      tooltip: {
                        callbacks: {
                          label: (context) =>
                            formatIDR(context.raw as number),
                        },
                      },
                      legend: { display: false },
                    },
                  }}
                />
              </div>
            </div>

            {/* Expense Breakdown */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold mb-6">
                Expense Breakdown
              </h2>

              <div className="h-64">
                <Pie
                  data={pieData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '60%',
                    plugins: {
                      tooltip: {
                        callbacks: {
                          label: (context) =>
                            `${context.label}: ${formatIDR(
                              context.raw as number
                            )}`,
                        },
                      },
                    },
                  }}
                />
              </div>
            </div>

            {/* Transactions */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold mb-4">
                Transactions ({result.transactions.length})
              </h2>

              <div className="max-h-96 overflow-auto border border-gray-100 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="p-3 text-left text-gray-500">Date</th>
                      <th className="p-3 text-left text-gray-500">Detail</th>
                      <th className="p-3 text-right text-gray-500">Amount</th>
                      <th className="p-3 text-left text-gray-500">Category</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.transactions.map((tx: any, i: number) => (
                      <tr key={i} className="border-t">
                        <td className="p-3">{tx.transactionDate}</td>
                        <td className="p-3">{tx.detail}</td>
                        <td
                          className={`p-3 text-right font-medium ${tx.type === 'debit'
                            ? 'text-red-600'
                            : 'text-green-600'
                            }`}
                        >
                          {tx.amount ? formatIDR(tx.amount) : '-'}
                        </td>
                        <td className="p-3 text-gray-500">
                          {tx.category || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                onClick={handleSave}
                className="mt-6 bg-green-600 hover:bg-green-700 transition text-white px-5 py-2 rounded-lg text-sm font-medium"
              >
                Save Statement Locally
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
