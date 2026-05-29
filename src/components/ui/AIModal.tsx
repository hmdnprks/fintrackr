interface Props {
  isOpen: boolean
  isProcessing: boolean
  error: string | null
  result: {
    total: number
    success: number
    remaining: { detail: string; amount: number }[]
  } | null
  onClose: () => void
}

export default function AIModal({
  isOpen,
  isProcessing,
  error,
  result,
  onClose,
}: Props) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={isProcessing ? undefined : onClose}
      />

      <div className="relative bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg mx-4 z-10 max-h-[90vh] overflow-y-auto">
        {isProcessing && (
          <div className="text-center py-6">
            <div className="inline-block w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4" />
            <h3 className="text-lg font-semibold text-gray-800">
              Categorizing Transactions
            </h3>
            <p className="text-sm text-gray-500 mt-2">
              Sending your uncategorized transactions to DeepSeek AI...
            </p>
          </div>
        )}

        {!isProcessing && result && (
          <div className="py-4">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800">
                Categorization Complete
              </h3>
              <p className="text-sm text-gray-500 mt-2">
                {result.success} of {result.total} transactions
                categorized successfully.
              </p>
            </div>

            {result.remaining.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-amber-600 font-semibold text-sm">
                    {result.remaining.length} still uncategorized
                  </span>
                  <span className="text-xs text-amber-500">
                    — AI couldn&apos;t determine these
                  </span>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1">
                  {result.remaining.map((tx, i) => (
                    <div
                      key={i}
                      className="flex justify-between text-sm bg-white p-2 rounded"
                    >
                      <span className="text-gray-700 truncate mr-2">
                        {tx.detail}
                      </span>
                      <span className="text-gray-400 shrink-0">
                        {tx.amount?.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-amber-600 mt-3">
                  Add keyword rules in Settings or manually select a category
                  in the transactions table.
                </p>
              </div>
            )}
          </div>
        )}

        {!isProcessing && !result && error && (
          <div className="text-center py-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800">
              Categorization Failed
            </h3>
            <p className="text-sm text-red-600 mt-2">{error}</p>
          </div>
        )}

        {!isProcessing && (
          <button
            onClick={onClose}
            className="mt-4 w-full bg-gray-800 hover:bg-black text-white py-2 rounded-lg text-sm transition"
          >
            Close
          </button>
        )}
      </div>
    </div>
  )
}
