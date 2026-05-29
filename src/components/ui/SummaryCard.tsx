interface SummaryCardProps {
  icon: React.ReactNode
  label: string
  value: string
  valueColor?: string
}

export default function SummaryCard({
  icon,
  label,
  value,
  valueColor,
}: SummaryCardProps) {
  return (
    <div className="bg-white p-5 rounded-xl shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <p className="text-xs text-gray-500">{label}</p>
      </div>
      <p className={`text-lg font-semibold ${valueColor || ''}`}>
        {value}
      </p>
    </div>
  )
}
