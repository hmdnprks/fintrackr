'use client'

import { useState, useMemo } from 'react'

import VaultGate from '@/components/VaultGate'
import DashboardHeader from '@/components/dashboard/DashboardHeader'
import SummarySection from '@/components/dashboard/SummarySection'
import IncomeExpenseSection from '@/components/dashboard/IncomeExpenseSection'
import MonthlyTrendSection from '@/components/dashboard/MonthlyTrendSection'
import CategorySection from '@/components/dashboard/CategorySection'
import TransactionSection from '@/components/dashboard/TransactionSection'
import AIInsightsPanel from '@/components/dashboard/AIInsightsPanel'
import AIModal from '@/components/ui/AIModal'
import AddTransactionModal from '@/components/dashboard/AddTransactionModal'
import BudgetSection from '@/components/dashboard/BudgetSection'

import { useStatements } from '@/hooks/useStatements'
import { useDashboardData } from '@/hooks/useDashboardData'
import { useAICategorization } from '@/hooks/useAICategorization'
import { formatIDR } from '@/lib/formatter'
import { getBudgets } from '@/lib/budgetStorage'
import { downloadCSV } from '@/lib/csvExport'

type Tab = 'overview' | 'budget' | 'transactions'

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'budget', label: 'Budget' },
  { id: 'transactions', label: 'Transactions' },
]

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [selectedYear, setSelectedYear] = useState('all')
  const [selectedMonth, setSelectedMonth] = useState('all')
  const [showAddTx, setShowAddTx] = useState(false)
  const [budgets, setBudgets] = useState(() => getBudgets())

  function handleYearChange(year: string) {
    setSelectedYear(year)
    setSelectedMonth('all')
  }

  const {
    statements,
    availableMonths,
    availableYears,
    deleteMonth,
    clearAll,
    reload,
  } = useStatements()

  const {
    totalIncome,
    totalExpense,
    trendChartData,
    categoryChartData,
    categoryPercentages,
    recurringSuggestions,
    allTransactions,
  } = useDashboardData(statements, selectedYear, selectedMonth)

  const {
    isCategorizing,
    isGeneratingInsights,
    error,
    insights,
    categorizedResult,
    categorizeAll,
    getInsights,
    clearCategorizedResult,
    clearError,
  } = useAICategorization(reload)

  const filteredMonths = selectedYear === 'all'
    ? availableMonths
    : availableMonths.filter((m) => m.value.startsWith(selectedYear))

  const currentMonthSpending = useMemo(() => {
    const now = new Date()
    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const map: Record<string, number> = {}
    for (const s of statements as Array<{ monthKey?: string; transactions?: Array<{ type?: string; amount?: number; category?: string; detail?: string; transactionDate?: string }> }>) {
      if (s.monthKey !== currentKey) continue
      for (const tx of s.transactions || []) {
        if (tx.type === 'debit') {
          const cat = tx.category || 'Uncategorized'
          map[cat] = (map[cat] || 0) + (tx.amount || 0)
        }
      }
    }
    return map
  }, [statements])

  function handleRecategorize(txIndex: number, newCategory: string) {
    const current = allTransactions[txIndex]
    if (!current) return

    const saved = JSON.parse(localStorage.getItem('fintrackr') || '[]')
    for (const statement of saved) {
      for (const tx of statement.transactions || []) {
        if (
          tx.transactionDate === current.transactionDate &&
          tx.detail === current.detail &&
          tx.amount === current.amount
        ) {
          tx.category = newCategory
        }
      }
    }
    localStorage.setItem('fintrackr', JSON.stringify(saved))
    reload()
  }

  function handleCategorizeGroup(indexes: number[], category: string) {
    const saved = JSON.parse(localStorage.getItem('fintrackr') || '[]')
    for (const idx of indexes) {
      const tx = allTransactions[idx]
      if (!tx) continue
      for (const statement of saved) {
        for (const stx of statement.transactions || []) {
          if (
            stx.transactionDate === tx.transactionDate &&
            stx.detail === tx.detail &&
            stx.amount === tx.amount
          ) {
            stx.category = category
          }
        }
      }
    }
    localStorage.setItem('fintrackr', JSON.stringify(saved))
    reload()
  }

  return (
    <VaultGate>
      <main className="min-h-screen bg-gray-50 py-10 px-6">
        <div className="max-w-6xl mx-auto space-y-6">

          <AIModal
            isOpen={isCategorizing || !!categorizedResult || !!error}
            isProcessing={isCategorizing}
            error={error}
            result={categorizedResult}
            onClose={() => {
              clearCategorizedResult()
              clearError()
            }}
          />

          <AddTransactionModal
            isOpen={showAddTx}
            onClose={() => setShowAddTx(false)}
            onSaved={reload}
          />

          <DashboardHeader
            selectedYear={selectedYear}
            years={availableYears}
            onYearChange={handleYearChange}
            selectedMonth={selectedMonth}
            months={filteredMonths}
            onMonthChange={setSelectedMonth}
            onDeleteMonth={() => deleteMonth(selectedMonth)}
            onClearAll={clearAll}
            onAddTransaction={() => setShowAddTx(true)}
            onExportCSV={() => downloadCSV(allTransactions)}
          />

          {/* Tab navigation */}
          <div className="flex gap-1 border-b border-gray-200">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Overview tab */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              <div className="flex justify-end">
                <button
                  onClick={() => getInsights(selectedYear, selectedMonth)}
                  disabled={isGeneratingInsights}
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 002.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                  </svg>
                  {isGeneratingInsights ? 'Generating...' : 'AI Insights'}
                </button>
              </div>

              {insights && <AIInsightsPanel insights={insights} />}

              <SummarySection
                totalIncome={totalIncome}
                totalExpense={totalExpense}
                formatIDR={formatIDR}
              />

              <IncomeExpenseSection
                income={totalIncome}
                expense={totalExpense}
              />

              <MonthlyTrendSection data={trendChartData} />
            </div>
          )}

          {/* Budget tab */}
          {activeTab === 'budget' && (
            <div className="space-y-8">
              <BudgetSection
                budgets={budgets}
                spending={currentMonthSpending}
                onBudgetChange={() => setBudgets(getBudgets())}
              />

              <CategorySection
                chartData={categoryChartData}
                percentages={categoryPercentages}
              />
            </div>
          )}

          {/* Transactions tab */}
          {activeTab === 'transactions' && (
            <TransactionSection
              transactions={allTransactions}
              recurringSuggestions={recurringSuggestions}
              onRecategorize={handleRecategorize}
              onCategorizeGroup={handleCategorizeGroup}
              onAICategorize={categorizeAll}
              isAICategorizing={isCategorizing}
            />
          )}

        </div>
      </main>
    </VaultGate>
  )
}
