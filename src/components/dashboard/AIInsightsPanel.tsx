function renderBold(text: string) {
  return text.split(/(\*\*.*?\*\*)/).map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>
      : part
  )
}

interface Props {
  insights: string
  isLoading: boolean
  period: string
  onGenerate: (force?: boolean) => void
  onClear: () => void
}

export default function AIInsightsPanel({ insights, isLoading, period, onGenerate, onClear }: Props) {
  const bullets = insights
    ? insights
        .split('\n')
        .map((l) => l.replace(/^[•\-]\s*/, '').trim())  // strip ONE bullet char + spaces, keep **bold**
        .filter((l) => l.length > 2)                    // filter empty lines and lone punctuation
    : []

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
          <div>
            <h2 className="text-base font-semibold text-gray-900">AI Insights</h2>
            {insights && !isLoading && (
              <p className="text-xs text-gray-400 mt-0.5">{period}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {insights && !isLoading && (
            <button
              onClick={onClear}
              className="text-xs text-gray-400 hover:text-gray-600 transition"
            >
              Clear
            </button>
          )}
          <button
            onClick={() => onGenerate(!!insights)}
            disabled={isLoading}
            className="flex items-center gap-1.5 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating...
              </>
            ) : (
              <>{insights ? 'Regenerate' : 'Generate'}</>
            )}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="px-6 py-5 space-y-2.5">
          {[80, 65, 90, 55].map((w, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-200 mt-1.5 shrink-0" />
              <div className={`h-3.5 bg-gray-100 rounded animate-pulse`} style={{ width: `${w}%` }} />
            </div>
          ))}
        </div>
      ) : bullets.length > 0 ? (
        <ul className="px-6 py-5 space-y-2.5">
          {bullets.map((bullet, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
              <span className="text-indigo-400 mt-0.5 shrink-0">•</span>
              <span>{renderBold(bullet)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="px-6 py-5 text-sm text-gray-400">
          Generate insights for <span className="font-medium text-gray-500">{period}</span>.
          <p className="text-xs text-gray-300 mt-1">
            Transaction descriptions are sent to DeepSeek&apos;s API.
          </p>
        </div>
      )}
    </div>
  )
}
