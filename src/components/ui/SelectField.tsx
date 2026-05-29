interface SelectFieldProps {
  value: string
  onChange: (value: string) => void
  options: { label: string; value: string }[]
  className?: string
}

export default function SelectField({
  value,
  onChange,
  options,
  className,
}: SelectFieldProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`border border-gray-200 px-3 py-2 rounded-xl text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ${className || ''}`}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}
