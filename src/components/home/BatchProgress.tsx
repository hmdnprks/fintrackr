import Link from 'next/link'

export type BatchItemStatus = 'pending' | 'processing' | 'saved' | 'duplicate' | 'error'

export type BatchItem = {
  file: File
  status: BatchItemStatus
  period?: string
  txCount?: number
  error?: string
}

interface Props {
  items: BatchItem[]
  isRunning: boolean
}

function StatusIcon({ status }: { status: BatchItemStatus }) {
  switch (status) {
    case 'pending':
      return (
        <div className="w-6 h-6 rounded-full border-2 border-gray-200 shrink-0" />
      )
    case 'processing':
      return (
        <svg className="w-6 h-6 animate-spin text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )
    case 'saved':
      return (
        <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shrink-0">
          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
      )
    case 'duplicate':
      return (
        <div className="w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center shrink-0">
          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
      )
    case 'error':
      return (
        <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center shrink-0">
          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      )
  }
}

export default function BatchProgress({ items, isRunning }: Props) {
  const saved     = items.filter((i) => i.status === 'saved').length
  const dupes     = items.filter((i) => i.status === 'duplicate').length
  const errors    = items.filter((i) => i.status === 'error').length
  const isDone    = !isRunning && items.every((i) => i.status !== 'pending' && i.status !== 'processing')
  const current   = items.findIndex((i) => i.status === 'processing') + 1
  const processed = items.filter((i) => !['pending', 'processing'].includes(i.status)).length

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">

      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            {isDone ? 'Import complete' : `Importing… ${processed} of ${items.length}`}
          </h2>
          {isRunning && (
            <p className="text-xs text-gray-400 mt-0.5">
              Processing file {current} of {items.length}
            </p>
          )}
          {isDone && (
            <p className="text-xs text-gray-400 mt-0.5">
              {saved > 0 && `${saved} saved`}
              {dupes > 0 && ` · ${dupes} already existed`}
              {errors > 0 && ` · ${errors} failed`}
            </p>
          )}
        </div>
        {isDone && saved > 0 && (
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-sm font-semibold text-green-700 hover:text-green-900 transition"
          >
            View Dashboard
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        )}
      </div>

      {/* Progress bar */}
      {!isDone && (
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-blue-500 transition-all duration-500"
            style={{ width: `${items.length > 0 ? (processed / items.length) * 100 : 0}%` }}
          />
        </div>
      )}

      {/* File list */}
      <div className="divide-y divide-gray-50">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-4 px-6 py-3.5">
            <StatusIcon status={item.status} />

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{item.file.name}</p>
              <p className="text-xs mt-0.5">
                {item.status === 'pending' && (
                  <span className="text-gray-400">Waiting…</span>
                )}
                {item.status === 'processing' && (
                  <span className="text-blue-500">Parsing…</span>
                )}
                {item.status === 'saved' && (
                  <span className="text-green-600">
                    {item.period ?? 'Saved'}
                    {item.txCount != null && ` · ${item.txCount} transactions`}
                  </span>
                )}
                {item.status === 'duplicate' && (
                  <span className="text-amber-600">
                    {item.period ?? 'Already imported'} — skipped
                  </span>
                )}
                {item.status === 'error' && (
                  <span className="text-red-500">{item.error ?? 'Failed'}</span>
                )}
              </p>
            </div>

            <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
              item.status === 'saved'      ? 'bg-green-50 text-green-700' :
              item.status === 'duplicate' ? 'bg-amber-50 text-amber-600' :
              item.status === 'error'     ? 'bg-red-50 text-red-500'     :
              item.status === 'processing'? 'bg-blue-50 text-blue-500'   :
              'bg-gray-100 text-gray-400'
            }`}>
              {item.status === 'saved'       ? 'Saved'       :
               item.status === 'duplicate'  ? 'Duplicate'  :
               item.status === 'error'      ? 'Error'       :
               item.status === 'processing' ? 'Processing'  :
               'Pending'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
