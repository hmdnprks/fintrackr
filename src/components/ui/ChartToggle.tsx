interface ChartToggleProps {
  value: string
  options: { label: string; value: string }[]
  onChange: (value: string) => void
}

export default function ChartToggle({
  value,
  options,
  onChange,
}: ChartToggleProps) {
  return (
    <div className="flex gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1 text-xs rounded-lg border transition ${value === opt.value
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-600'
            }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
