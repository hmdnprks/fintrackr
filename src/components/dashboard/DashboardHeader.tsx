interface MonthOption {
  label: string
  value: string
}

interface DashboardHeaderProps {
  selectedYear: string
  years: string[]
  onYearChange: (value: string) => void
  selectedMonth: string
  months: MonthOption[]
  onMonthChange: (value: string) => void
  onDeleteMonth?: () => void
  onClearAll?: () => void
  onAddTransaction?: () => void
  onExportCSV?: () => void
}

export default function DashboardHeader({
  selectedYear,
  years,
  onYearChange,
  selectedMonth,
  months,
  onMonthChange,
  onDeleteMonth,
  onClearAll,
  onAddTransaction,
  onExportCSV,
}: DashboardHeaderProps) {
  const periodLabel =
    selectedMonth !== 'all'
      ? months.find((m) => m.value === selectedMonth)?.label ?? selectedMonth
      : selectedYear !== 'all'
      ? selectedYear
      : 'All time'

  return (
    <div className="space-y-4">

      {/* Row 1 — title + primary action */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financial Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">{periodLabel}</p>
        </div>

        {onAddTransaction && (
          <button
            onClick={onAddTransaction}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span className="hidden sm:inline">Add Transaction</span>
            <span className="sm:hidden">Add</span>
          </button>
        )}
      </div>

      {/* Row 2 — filters (left) + actions (right), stacks on mobile */}
      <div className="flex flex-wrap items-center gap-2">

        {/* Period selects */}
        <select
          value={selectedYear}
          onChange={(e) => onYearChange(e.target.value)}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Years</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>

        <select
          value={selectedMonth}
          onChange={(e) => onMonthChange(e.target.value)}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Months</option>
          {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>

        {/* Actions pushed right */}
        <div className="flex items-center gap-2 ml-auto">
          {onExportCSV && (
            <button
              onClick={onExportCSV}
              title="Export CSV"
              className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-300 bg-white px-3 py-2 rounded-xl transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          )}

          {selectedMonth !== 'all' && onDeleteMonth && (
            <button
              onClick={onDeleteMonth}
              title="Delete month"
              className="flex items-center gap-1.5 text-sm font-medium text-red-500 hover:text-red-700 border border-red-200 hover:border-red-300 bg-white hover:bg-red-50 px-3 py-2 rounded-xl transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
              <span className="hidden sm:inline">Delete Month</span>
            </button>
          )}

          {onClearAll && (
            <button
              onClick={onClearAll}
              title="Clear all data"
              className="flex items-center gap-1 text-sm text-gray-400 hover:text-red-500 transition p-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span className="hidden sm:inline text-xs">Clear All</span>
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
