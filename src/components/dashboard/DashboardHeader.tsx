import SelectField from '@/components/ui/SelectField'
import Button from '@/components/ui/Button'

interface MonthOption {
  label: string
  value: string
}

interface DashboardHeaderProps {
  selectedMonth: string
  months: MonthOption[]
  onMonthChange: (value: string) => void
  onDeleteMonth?: () => void
  onClearAll?: () => void
}

export default function DashboardHeader({
  selectedMonth,
  months,
  onMonthChange,
  onDeleteMonth,
  onClearAll,
}: DashboardHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">

      {/* Left: Title */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800">
          Financial Dashboard
        </h1>
        <p className="text-gray-500 text-sm">
          Accumulated Local Statements
        </p>
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-3">

        <SelectField
          value={selectedMonth}
          onChange={onMonthChange}
          options={[
            { label: 'All Months', value: 'all' },
            ...months,
          ]}
        />

        {selectedMonth !== 'all' && onDeleteMonth && (
          <Button
            variant="danger"
            size="md"
            onClick={onDeleteMonth}
          >
            Delete Month
          </Button>
        )}

        {onClearAll && (
          <Button
            variant="dark"
            size="md"
            onClick={onClearAll}
          >
            Clear All
          </Button>
        )}

      </div>
    </div>
  )
}
