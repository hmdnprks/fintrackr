/* eslint-disable @typescript-eslint/no-explicit-any */
interface Props {
  suggestions: any[]
  formatIDR: (n: number) => string
}

export default function RecurringSuggestionPanel({
  suggestions,
  formatIDR,
}: Props) {
  if (!suggestions.length) return null

  return (
    <div className="bg-yellow-50 border border-yellow-200 p-5 rounded-xl">
      <h3 className="text-sm font-semibold mb-3">
        Recurring Uncategorized Transactions
      </h3>

      <div className="space-y-3">
        {suggestions.map((item) => (
          <div key={item.normalizedDetail} className="text-sm">
            <div className="font-medium">
              {item.sampleDetail}
            </div>
            <div className="text-gray-500 text-xs">
              {item.occurrences} times • Total{' '}
              {formatIDR(item.totalAmount)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
