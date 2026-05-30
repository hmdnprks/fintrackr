'use client'

import { useState, useMemo, useEffect } from 'react'

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
import AssetsTab from '@/components/dashboard/AssetsTab'

import { useStatements } from '@/hooks/useStatements'
import { useDashboardData } from '@/hooks/useDashboardData'
import { useAICategorization } from '@/hooks/useAICategorization'
import { useMonthComparison } from '@/hooks/useMonthComparison'
import { formatIDR } from '@/lib/formatter'
import { getBudgets } from '@/lib/budgetStorage'
import { downloadCSV } from '@/lib/csvExport'
import MonthComparisonSection from '@/components/dashboard/MonthComparisonSection'
import CalendarSection from '@/components/dashboard/CalendarSection'
import SavingsRateTrendSection from '@/components/dashboard/SavingsRateTrendSection'
import SpendingBreakdownSection from '@/components/dashboard/SpendingBreakdownSection'
import RecurringExpensesSection from '@/components/dashboard/RecurringExpensesSection'
import InvestmentRateSection from '@/components/dashboard/InvestmentRateSection'
import FinancialHealthScore from '@/components/dashboard/FinancialHealthScore'
import FIRENumberSection from '@/components/dashboard/FIRENumberSection'
import { getVaultDataSync, saveVaultData } from '@/lib/storage/secureStorage'
import { useVault } from '@/context/VaultContext'

type Tab = 'overview' | 'insights' | 'budget' | 'transactions' | 'assets'

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview',     label: 'Overview'      },
  { id: 'insights',     label: 'Insights'      },
  { id: 'budget',       label: 'Budget'        },
  { id: 'transactions', label: 'Transactions'  },
  { id: 'assets',       label: 'Assets'        },
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

  // useStatements initializes before the vault is unlocked (VaultGate is in JSX, not
  // wrapping the component). Reload once as soon as the vault becomes unlocked so
  // the dashboard doesn't show empty data on first visit.
  const { unlocked } = useVault()
  useEffect(() => {
    if (unlocked) {
      reload()
      setBudgets(getBudgets())
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked])

  const {
    totalIncome,
    totalExpense,
    trendChartData,
    recurringSuggestions,
    allTransactions,
    savingsRateTrend,
    spendingBreakdown,
    recurringExpenses,
    investmentRate,
  } = useDashboardData(statements, selectedYear, selectedMonth)

  const avgMonthlyIncome = useMemo(() => {
    if (!savingsRateTrend.length) return 0
    return savingsRateTrend.reduce((s, d) => s + d.income, 0) / savingsRateTrend.length
  }, [savingsRateTrend])

  const {
    isCategorizing,
    categorizingStatus,
    isGeneratingInsights,
    error,
    insights,
    categorizedResult,
    categorizeAll,
    getInsights,
    clearCategorizedResult,
    clearError,
    clearInsights,
    resetInsights,
  } = useAICategorization(reload)

  const filteredMonths = selectedYear === 'all'
    ? availableMonths
    : availableMonths.filter((m) => m.value.startsWith(selectedYear))

  // Clear displayed insights whenever the filter changes
  useEffect(() => {
    resetInsights()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, selectedMonth])

  const comparison = useMonthComparison(statements, selectedMonth)

  const insightsPeriodLabel = useMemo(() => {
    if (selectedMonth !== 'all') {
      const [y, m] = selectedMonth.split('-').map(Number)
      return new Date(y, m - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })
    }
    if (selectedYear !== 'all') return selectedYear
    return 'all time'
  }, [selectedYear, selectedMonth])

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
      <main className="min-h-screen bg-gray-50 dark:bg-gray-950 py-6 px-4 sm:py-10 sm:px-6">
        <div className="max-w-6xl mx-auto space-y-6">

          <AIModal
            isOpen={isCategorizing || !!categorizedResult || !!error}
            isProcessing={isCategorizing}
            processingStatus={categorizingStatus}
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

          {/* Tab navigation — scrollable on mobile so 5 labels don't cramp */}
          <div className="-mx-4 sm:mx-0 px-4 sm:px-0 overflow-x-auto border-b border-gray-200 dark:border-gray-800">
            <div className="flex min-w-max sm:min-w-0">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`shrink-0 px-4 sm:px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Overview tab — summary + trends + calendar */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
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

              {selectedMonth !== 'all' && (
                <CalendarSection
                  allTransactions={allTransactions}
                  selectedMonth={selectedMonth}
                  onRecategorize={handleRecategorize}
                />
              )}
            </div>
          )}

          {/* Insights tab — AI + financial health metrics */}
          {activeTab === 'insights' && (
            <div className="space-y-8">
              <AIInsightsPanel
                insights={insights ?? ''}
                isLoading={isGeneratingInsights}
                period={insightsPeriodLabel}
                onGenerate={(force) => getInsights(allTransactions, selectedYear, selectedMonth, force)}
                onClear={clearInsights}
              />

              <FinancialHealthScore
                savingsRateTrend={savingsRateTrend}
                investmentRate={investmentRate.rate}
                budgets={budgets}
                currentMonthSpending={currentMonthSpending}
              />

              <SpendingBreakdownSection data={spendingBreakdown} />

              <SavingsRateTrendSection data={savingsRateTrend} />

              <InvestmentRateSection
                rate={investmentRate.rate}
                total={investmentRate.total}
                items={investmentRate.items}
                totalIncome={totalIncome}
              />
            </div>
          )}

          {/* Budget tab */}
          {activeTab === 'budget' && (
            <div className="space-y-8">
              <BudgetSection
                budgets={budgets}
                spending={currentMonthSpending}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                statements={statements as any[]}
                onBudgetChange={() => setBudgets(getBudgets())}
              />

              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <GoalSection statements={statements as any[]} />

              <CategorySection allTransactions={allTransactions} />

              <RecurringExpensesSection
                items={recurringExpenses}
                avgMonthlyIncome={avgMonthlyIncome}
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

          {/* Assets tab */}
          {activeTab === 'assets' && (
            <div className="space-y-8">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <AssetsTab statements={statements as any[]} />
              <FIRENumberSection savingsRateTrend={savingsRateTrend} />
            </div>
          )}

        </div>
      </main>
    </VaultGate>
  )
}
