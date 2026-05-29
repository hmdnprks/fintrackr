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
import GoalSection from '@/components/dashboard/GoalSection'

import { useStatements } from '@/hooks/useStatements'
import { useDashboardData } from '@/hooks/useDashboardData'
import { useAICategorization } from '@/hooks/useAICategorization'
import { useMonthComparison } from '@/hooks/useMonthComparison'
import { formatIDR } from '@/lib/formatter'
import { getBudgets } from '@/lib/budgetStorage'
import { downloadCSV } from '@/lib/csvExport'
import MonthComparisonSection from '@/components/dashboard/MonthComparisonSection'
import { getVaultDataSync, saveVaultData } from '@/lib/storage/secureStorage'

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
    clearInsights,
  } = useAICategorization(reload)

  const filteredMonths = selectedYear === 'all'
    ? availableMonths
    : availableMonths.filter((m) => m.value.startsWith(selectedYear))

  const comparison = useMonthComparison(statements, selectedMonth)

  const currentMonthSpending = useMemo(() => {
    const now = new Date()
    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const map: Record<string, number> = {}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const s of statements as any[]) {
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

  async function handleRecategorize(txIndex: number, newCategory: string) {
    const current = allTransactions[txIndex]
    if (!current) return

    const saved = [...getVaultDataSync().statements]
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
    await saveVaultData({ statements: saved })
    reload()
  }

  async function handleCategorizeGroup(indexes: number[], category: string) {
    const saved = [...getVaultDataSync().statements]
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
    await saveVaultData({ statements: saved })
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
              <AIInsightsPanel
                insights={insights ?? ''}
                isLoading={isGeneratingInsights}
                onGenerate={() => getInsights(selectedYear, selectedMonth)}
                onClear={clearInsights}
              />

              <SummarySection
                totalIncome={totalIncome}
                totalExpense={totalExpense}
                formatIDR={formatIDR}
                comparison={comparison}
              />

              <IncomeExpenseSection
                income={totalIncome}
                expense={totalExpense}
              />

              <MonthlyTrendSection data={trendChartData} />

              {comparison && (
                <MonthComparisonSection comparison={comparison} />
              )}
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

              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <GoalSection statements={statements as any[]} />

              <CategorySection allTransactions={allTransactions} />
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
