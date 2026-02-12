/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useMemo, useState } from 'react'
import {
  ArrowUpIcon,
  ArrowDownIcon,
  WalletIcon,
  ChartBarIcon,
} from '@heroicons/react/24/solid'
import {
  getSavedStatements,
  deleteStatementsByMonth,
  clearAllStatements,
} from '@/lib/storage'

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js'

import { Bar, Line, Pie } from 'react-chartjs-2'
import { aggregateTransactions } from '@/lib/finance'
import { categorizeTransaction } from '@/lib/categorizer/mandiri/transactionCategorizer'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend
)

export default function Dashboard() {
  const [selectedMonth, setSelectedMonth] = useState<string>('all')

  const [statements, setStatements] = useState<any[]>(() =>
    getSavedStatements()
  )

  const [categoryChartType, setCategoryChartType] = useState<'bar' | 'donut'>('donut')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')



  function formatIDR(amount: number) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  // Extract month label from period
  function extractMonthMeta(period: string) {
    const match = period?.match(/\/(\d{2})\/(\d{2})/)
    if (!match) return null

    const month = match[1]
    const year = '20' + match[2]

    const date = new Date(Number(year), Number(month) - 1)

    return {
      label: date.toLocaleString('en-US', {
        month: 'long',
        year: 'numeric',
      }),
      key: `${year}-${month}`, // sortable
      date,
    }
  }


  // Prepare enriched data
  const enrichedStatements = useMemo(() => {
    return statements
      .map((s) => {
        const meta = extractMonthMeta(
          s.accountSummary?.period
        )

        return {
          ...s,
          monthLabel: meta?.label,
          monthKey: meta?.key,
          monthDate: meta?.date,
        }
      })
      .filter((s) => s.monthKey)
      .sort((a, b) =>
        a.monthDate.getTime() - b.monthDate.getTime()
      ) // earliest first
  }, [statements])


  const availableMonths = enrichedStatements
    .map((s) => ({
      key: s.monthKey,
      label: s.monthLabel,
    }))
    .filter(
      (v, i, arr) =>
        arr.findIndex((x) => x.key === v.key) === i
    )
    .sort((a, b) => a.key.localeCompare(b.key))



  // Filter by month
  const filteredStatements =
    selectedMonth === 'all'
      ? enrichedStatements
      : enrichedStatements.filter(
        (s) => s.monthKey === selectedMonth
      )



  // Trend per month
  const trendDataMap: Record<
    string,
    { label: string; income: number; expense: number }
  > = {}

  enrichedStatements.forEach((s) => {
    if (!trendDataMap[s.monthKey]) {
      trendDataMap[s.monthKey] = {
        label: s.monthLabel,
        income: 0,
        expense: 0,
      }
    }

    s.transactions?.forEach((t: any) => {
      if (t.type === 'credit')
        trendDataMap[s.monthKey].income += t.amount || 0
      if (t.type === 'debit')
        trendDataMap[s.monthKey].expense += t.amount || 0
    })
  })

  const sortedMonthKeys = Object.keys(trendDataMap).sort(
    (a, b) =>
      new Date(a).getTime() -
      new Date(b).getTime()
  )

  const trendChartData = {
    labels: sortedMonthKeys.map(
      (k) => trendDataMap[k].label
    ),
    datasets: [
      {
        label: 'Income',
        data: sortedMonthKeys.map(
          (k) => trendDataMap[k].income
        ),
        borderColor: '#22c55e',
        backgroundColor: '#22c55e',
      },
      {
        label: 'Expense',
        data: sortedMonthKeys.map(
          (k) => trendDataMap[k].expense
        ),
        borderColor: '#ef4444',
        backgroundColor: '#ef4444',
      },
    ],
  }

  function parseTransactionDate(
    txDate: string,
    monthDate: Date
  ) {
    const [day, month] = txDate.split('/')
    return new Date(
      monthDate.getFullYear(),
      Number(month) - 1,
      Number(day)
    )
  }


  const allTransactions = filteredStatements
    .flatMap((s) =>
      (s.transactions || []).map((t: any) => ({
        ...t,
        category: categorizeTransaction(t.detail, t.type),
        fullDate: parseTransactionDate(
          t.transactionDate,
          s.monthDate
        ),
      }))
    )
    .sort(
      (a, b) =>
        a.fullDate.getTime() -
        b.fullDate.getTime()
    )

  const expenseByCategory = allTransactions
    .reduce((acc: Record<string, number>, tx: any) => {
      const category = tx.category || 'Uncategorized'
      acc[category] = (acc[category] || 0) + (tx.amount || 0)
      return acc
    }, {})


  const expenseEntries = Object.entries(expenseByCategory)
    .sort((a, b) => b[1] - a[1])

  const totalCategoryExpense = expenseEntries.reduce(
    (sum, [, value]) => sum + value,
    0
  )

  const categoryLabels = expenseEntries.map(([key]) => key)
  const categoryValues = expenseEntries.map(([, value]) => value)

  const categoryPercentages = expenseEntries.map(
    ([_, value]) =>
      totalCategoryExpense === 0
        ? 0
        : ((value / totalCategoryExpense) * 100).toFixed(1)
  )



  const { totalIncome, totalExpense } =
    aggregateTransactions(filteredStatements)

  const availableCategories = [
    'all',
    ...new Set(allTransactions.map((t) => t.category)),
  ]

  const categoryFilteredTransactions =
    selectedCategory === 'all'
      ? allTransactions
      : allTransactions.filter(
        (t) => t.category === selectedCategory
      )

  const categoryTotal = categoryFilteredTransactions.reduce(
    (sum, t) => sum + (t.amount || 0),
    0
  )



  const barData = {
    labels: ['Income', 'Expense'],
    datasets: [
      {
        data: [totalIncome, totalExpense],
        backgroundColor: ['#22c55e', '#ef4444'],
        borderRadius: 8,
      },
    ],
  }

  const categoryChartData = {
    labels: categoryLabels,
    datasets: [
      {
        data: categoryValues,
        backgroundColor: [
          '#ef4444',
          '#f97316',
          '#eab308',
          '#22c55e',
          '#3b82f6',
          '#a855f7',
          '#14b8a6',
          '#f43f5e',
          '#6366f1',
        ],
        borderWidth: 1,
      },
    ],
  }



  function handleDeleteMonth(monthKey: string) {
    const confirmed = confirm(
      `Delete all data for month ${monthKey}?`
    )
    if (!confirmed) return

    deleteStatementsByMonth(monthKey)

    setStatements(getSavedStatements())
  }

  function handleClearAll() {
    const confirmed = confirm(
      'Delete ALL saved statements?'
    )
    if (!confirmed) return

    clearAllStatements()
    setStatements([])
  }



  return (
    <main className="min-h-screen bg-gray-50 py-10 px-6">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              Financial Dashboard
            </h1>
            <p className="text-gray-500 text-sm">
              Accumulated Local Statements
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedMonth}
              onChange={(e) =>
                setSelectedMonth(e.target.value)
              }
              className="border p-2 rounded-lg text-sm"
            >
              <option value="all">All Months</option>
              {availableMonths.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}

            </select>

            {selectedMonth !== 'all' && (
              <button
                onClick={() =>
                  handleDeleteMonth(selectedMonth)
                }
                className="bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-2 rounded-lg"
              >
                Delete Month
              </button>
            )}

            <button
              onClick={handleClearAll}
              className="bg-gray-800 hover:bg-black text-white text-sm px-3 py-2 rounded-lg"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white p-5 rounded-xl shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <ArrowUpIcon className="w-4 h-4 text-green-600" />
              <p className="text-xs text-gray-500">Income</p>
            </div>
            <p className="text-lg font-semibold text-green-600">
              {formatIDR(totalIncome)}
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <ArrowDownIcon className="w-4 h-4 text-red-600" />
              <p className="text-xs text-gray-500">Expense</p>
            </div>
            <p className="text-lg font-semibold text-red-600">
              {formatIDR(totalExpense)}
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <WalletIcon className="w-4 h-4 text-blue-600" />
              <p className="text-xs text-gray-500">Net</p>
            </div>
            <p className="text-lg font-semibold">
              {formatIDR(totalIncome - totalExpense)}
            </p>
          </div>
        </div>

        {/* Income vs Expense */}
        <div className="bg-white p-6 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <ChartBarIcon className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold">
              Income vs Expense
            </h2>
          </div>

          <div className="h-56">
            <Bar
              data={barData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
              }}
            />
          </div>
        </div>

        {/* Trend Over Time */}
        <div className="bg-white p-6 rounded-2xl shadow-sm">
          <h2 className="text-lg font-semibold mb-6">
            Monthly Trend
          </h2>

          <div className="h-64">
            <Line
              data={trendChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
              }}
            />
          </div>
        </div>

        {/* Transaction by Category */}
        <div className="bg-white p-6 rounded-2xl shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold">
              Transaction by Category
            </h2>

            <div className="flex gap-2">
              <button
                onClick={() => setCategoryChartType('bar')}
                className={`px-3 py-1 text-xs rounded-lg border ${categoryChartType === 'bar'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600'
                  }`}
              >
                Bar
              </button>

              <button
                onClick={() => setCategoryChartType('donut')}
                className={`px-3 py-1 text-xs rounded-lg border ${categoryChartType === 'donut'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600'
                  }`}
              >
                Donut
              </button>
            </div>
          </div>

          {categoryValues.length === 0 ? (
            <p className="text-sm text-gray-500">
              No expense data available.
            </p>
          ) : (
            <div className="h-72">
              {categoryChartType === 'bar' ? (
                <Bar
                  data={categoryChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        callbacks: {
                          label: (context) => {
                            const index = context.dataIndex
                            return `${formatIDR(
                              context.raw as number
                            )} (${categoryPercentages[index]}%)`
                          },
                        },
                      },
                    },
                  }}
                />
              ) : (
                <Pie
                  data={categoryChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '60%', // makes it donut
                    plugins: {
                      tooltip: {
                        callbacks: {
                          label: (context) => {
                            const index = context.dataIndex
                            return `${context.label}: ${formatIDR(
                              context.raw as number
                            )} (${categoryPercentages[index]}%)`
                          },
                        },
                      },
                    },
                  }}
                />
              )}
            </div>
          )}

          {/* Legend with Percentage */}
          {categoryValues.length > 0 && (
            <div className="mt-6 grid md:grid-cols-2 gap-3 text-sm">
              {expenseEntries.map(([label, value], i) => (
                <div
                  key={label}
                  className="flex justify-between bg-gray-50 px-3 py-2 rounded-lg"
                >
                  <span className="text-gray-700">
                    {label}
                  </span>
                  <span className="font-medium">
                    {formatIDR(value)} ({categoryPercentages[i]}%)
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>


        {/* Transactions */}
        <div className="bg-white p-6 rounded-2xl shadow-sm">

          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-5">

            <h2 className="text-lg font-semibold">
              Transactions ({categoryFilteredTransactions.length})
            </h2>

            <div className="flex items-center gap-3">

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="border p-2 rounded-lg text-sm"
              >
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === 'all' ? 'All Categories' : cat}
                  </option>
                ))}
              </select>

              <div className="text-sm font-medium text-gray-700">
                Total:{" "}
                <span className="font-semibold">
                  {formatIDR(categoryTotal)}
                </span>
              </div>

            </div>
          </div>

          <div className="max-h-96 overflow-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="p-3 text-left">Date</th>
                  <th className="p-3 text-left">Detail</th>
                  <th className="p-3 text-right">Amount</th>
                  <th className="p-3 text-left">Category</th>
                </tr>
              </thead>

              <tbody>
                {categoryFilteredTransactions.map((tx: any, i: number) => (
                  <tr key={i} className="border-t hover:bg-gray-50 transition">
                    <td className="p-3">
                      {tx.fullDate?.toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </td>

                    <td className="p-3">{tx.detail}</td>

                    <td
                      className={`p-3 text-right font-medium ${tx.type === 'debit'
                        ? 'text-red-600'
                        : 'text-green-600'
                        }`}
                    >
                      {formatIDR(tx.amount || 0)}
                    </td>

                    <td className="p-3 text-gray-600">
                      {tx.category}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>


      </div>
    </main>
  )
}
