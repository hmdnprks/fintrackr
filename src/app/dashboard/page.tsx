'use client'

import { useState } from 'react'

import VaultGate from '@/components/VaultGate'
import DashboardHeader from '@/components/dashboard/DashboardHeader'
import SummarySection from '@/components/dashboard/SummarySection'
import IncomeExpenseSection from '@/components/dashboard/IncomeExpenseSection'
import MonthlyTrendSection from '@/components/dashboard/MonthlyTrendSection'
import CategorySection from '@/components/dashboard/CategorySection'
import TransactionSection from '@/components/dashboard/TransactionSection'

import { useStatements } from '@/hooks/useStatements'
import { useDashboardData } from '@/hooks/useDashboardData'
import { formatIDR } from '@/lib/formatter'
import '@/lib/chartjs'

export default function Dashboard() {
  const [selectedYear, setSelectedYear] = useState('all')
  const [selectedMonth, setSelectedMonth] = useState('all')

  function handleYearChange(year: string) {
    setSelectedYear(year)
    setSelectedMonth('all')
  }

  /**
   * Storage Layer
   */
  const {
    statements,
    availableMonths,
    availableYears,
    deleteMonth,
    clearAll,
  } = useStatements()

  /**
   * Finance Aggregation Layer
   */
  const {
    totalIncome,
    totalExpense,
    trendChartData,
    categoryChartData,
    categoryPercentages,
    recurringSuggestions,
    allTransactions,
  } = useDashboardData(statements, selectedYear, selectedMonth)

  const filteredMonths = selectedYear === 'all'
    ? availableMonths
    : availableMonths.filter((m) => m.value.startsWith(selectedYear))

  return (
    <VaultGate>
      <main className="min-h-screen bg-gray-50 py-10 px-6">
        <div className="max-w-6xl mx-auto space-y-8">

          <DashboardHeader
            selectedYear={selectedYear}
            years={availableYears}
            onYearChange={handleYearChange}
            selectedMonth={selectedMonth}
            months={filteredMonths}
            onMonthChange={setSelectedMonth}
            onDeleteMonth={() => deleteMonth(selectedMonth)}
            onClearAll={clearAll}
          />

          <SummarySection
            totalIncome={totalIncome}
            totalExpense={totalExpense}
            formatIDR={formatIDR}
          />

          <IncomeExpenseSection
            income={totalIncome}
            expense={totalExpense}
          />

          <MonthlyTrendSection
            data={trendChartData}
          />

          <CategorySection
            chartData={categoryChartData}
            percentages={categoryPercentages}
          />

          <TransactionSection
            transactions={allTransactions}
            recurringSuggestions={recurringSuggestions}
          />

        </div>
      </main>
    </VaultGate>
  )
}
