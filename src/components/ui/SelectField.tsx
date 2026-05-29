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
      className={`border p-2 rounded-lg text-sm ${className || ''}`}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}
