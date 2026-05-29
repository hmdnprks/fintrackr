interface ChartContainerProps {
  title: string
  icon?: React.ReactNode
  right?: React.ReactNode
  children: React.ReactNode
  height?: string
}

export default function ChartContainer({
  title,
  icon,
  right,
  children,
  height = 'h-64',
}: ChartContainerProps) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
        {right}
      </div>

      <div className={height}>{children}</div>
    </div>
  )
}
