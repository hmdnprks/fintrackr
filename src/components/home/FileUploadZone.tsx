'use client'

import { useRef, useState } from 'react'

type FileUploadZoneProps = {
  files: File[]
  onFilesChange: (files: File[]) => void
  loading: boolean
  onSubmit: (password: string) => void
  error: string | null
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function FileUploadZone({
  files,
  onFilesChange,
  loading,
  onSubmit,
  error,
}: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [password, setPassword] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const dropped = Array.from(e.dataTransfer.files).filter(
      (f) => f.type === 'application/pdf'
    )
    if (dropped.length) onFilesChange(dropped)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []).filter(
      (f) => f.type === 'application/pdf'
    )
    if (selected.length) onFilesChange(selected)
  }

  function removeFile(index: number) {
    const updated = files.filter((_, i) => i !== index)
    onFilesChange(updated)
    // reset input so the same file can be re-added
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const hasFiles   = files.length > 0
  const isBatch    = files.length > 1
  const buttonLabel = loading
    ? isBatch ? `Importing ${files.length} statements…` : 'Parsing…'
    : isBatch ? `Import ${files.length} Statements` : 'Parse Statement'

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragging(false) }}
        onDrop={handleDrop}
        onClick={() => !hasFiles && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl transition ${
          isDragging
            ? 'border-blue-400 bg-blue-50'
            : hasFiles
            ? 'border-green-300 bg-green-50'
            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 cursor-pointer'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          multiple
          className="hidden"
          onChange={handleInputChange}
        />

        {hasFiles ? (
          <div className="px-5 py-3 space-y-1">
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-3 py-1">
                <div className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{f.name}</p>
                  <p className="text-xs text-gray-400">{formatFileSize(f.size)}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); removeFile(i) }}
                  className="text-gray-400 hover:text-red-500 transition p-1 shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
            {/* Add more */}
            <button
              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 py-1 transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add more files
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <p className="text-sm text-gray-500">
              Drop PDF{' '}files here or <span className="text-blue-600 font-medium">browse</span>
            </p>
            <p className="text-xs text-gray-400">Multiple files supported — Mandiri statements only</p>
          </div>
        )}
      </div>

      {/* Password */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-medium text-gray-700">PDF Password</label>
          <span className="text-xs text-gray-400">
            Usually your date of birth — <span className="font-medium">DDMMYYYY</span>
          </span>
        </div>
        <input
          type="password"
          placeholder={isBatch ? 'Same password applied to all files' : 'Leave blank if no password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSubmit(password)}
          className="w-full border border-gray-200 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Submit */}
      <button
        onClick={() => onSubmit(password)}
        disabled={!hasFiles || loading}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-white py-3 rounded-xl text-sm font-semibold"
      >
        {loading ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {buttonLabel}
          </>
        ) : buttonLabel}
      </button>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <svg className="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  )
}
