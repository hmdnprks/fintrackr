interface Delta {
  pct: number
  isGood: boolean  // controls green vs red coloring
}

interface SummaryCardProps {
  icon: React.ReactNode
  label: string
  value: string
  valueColor?: string
  delta?: Delta | null
}

export default function SummaryCard({
  icon,
  label,
  value,
  valueColor,
  delta,
}: SummaryCardProps) {
  return (
    <div className="bg-white p-5 rounded-xl shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <p className="text-xs text-gray-500">{label}</p>
      </div>
      <p className={`text-lg font-semibold ${valueColor || 'text-gray-800'}`}>
        {value}
      </p>
      {delta != null && (
        <div className="flex items-center gap-1 mt-1.5">
          <span className={`flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full ${
            delta.isGood
              ? 'bg-green-50 text-green-600'
              : 'bg-red-50 text-red-500'
          }`}>
            {delta.pct > 0 ? '↑' : '↓'}
            {Math.abs(delta.pct).toFixed(1)}%
          </span>
          <span className="text-xs text-gray-400">vs last month</span>
        </div>
      )}
    </div>
  )
}
