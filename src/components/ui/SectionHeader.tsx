interface SectionHeaderProps {
  title: string
  icon?: React.ReactNode
  right?: React.ReactNode
}

export default function SectionHeader({ title, icon, right }: SectionHeaderProps) {
  return (
    <div className="flex justify-between items-center mb-6">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      {right}
    </div>
  )
}
