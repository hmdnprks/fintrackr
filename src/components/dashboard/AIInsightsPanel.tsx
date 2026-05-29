function renderBold(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-gray-900">
          {part.slice(2, -2)}
        </strong>
      )
    }
    return part
  })
}

interface Props {
  insights: string
}

export default function AIInsightsPanel({ insights }: Props) {
  const bullets = insights
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => line.replace(/^[-*\d.]+/, '').trim())

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-6 rounded-2xl shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">🧠</span>
        <h2 className="text-lg font-semibold text-gray-800">
          AI Insights
        </h2>
      </div>

      <ul className="space-y-2">
        {bullets.map((bullet, i) => (
          <li
            key={i}
            className="flex items-start gap-2 text-sm text-gray-700"
          >
            <span className="text-blue-500 mt-1 shrink-0">•</span>
            <span>{renderBold(bullet)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
