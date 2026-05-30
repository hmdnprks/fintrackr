'use client'

import { useRef, useState } from 'react'
import {
  downloadBackup,
  validateBackup,
  restoreBackup,
  getBackupSummary,
  type BackupData,
  type BackupSummary,
} from '@/lib/backup'

export default function BackupSection({ onRestored }: { onRestored?: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<BackupData | null>(null)
  const [summary, setSummary] = useState<BackupSummary | null>(null)
  const [parseError, setParseError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setParseError('')
    setSuccessMsg('')
    setPending(null)
    setSummary(null)

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const raw = JSON.parse(ev.target?.result as string)
        if (!validateBackup(raw)) {
          setParseError('Invalid backup file. Make sure you are using a Fintrackr backup.')
          return
        }
        setPending(raw)
        setSummary(getBackupSummary(raw))
      } catch {
        setParseError('Could not read file. Make sure it is a valid JSON backup.')
      }
    }
    reader.readAsText(file)
  }

  function handleRestore(mode: 'replace' | 'merge') {
    if (!pending) return
    restoreBackup(pending, mode)
    setPending(null)
    setSummary(null)
    setSuccessMsg(mode === 'replace' ? 'All data replaced from backup.' : 'Backup merged with existing data.')
    if (fileRef.current) fileRef.current.value = ''
    onRestored?.()
  }

  function handleCancel() {
    setPending(null)
    setSummary(null)
    setParseError('')
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Data Backup & Restore</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Export your data to keep a safe copy. Restore it any time on any device.
        </p>
      </div>

      <div className="divide-y divide-gray-100 dark:divide-gray-800">

        {/* Export */}
        <div className="px-6 py-5 flex items-start justify-between gap-6">
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Export backup</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Downloads a <code className="bg-gray-100 dark:bg-gray-800 dark:text-gray-300 px-1 rounded">.json</code> file containing your statements, manual transactions, categorization rules, and budgets.
              Vault credentials are not included.
            </p>
          </div>
          <button
            onClick={downloadBackup}
            className="flex items-center gap-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl transition shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Download Backup
          </button>
        </div>

        {/* Restore */}
        <div className="px-6 py-5 space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Restore from backup</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Select a previously exported Fintrackr backup file.
            </p>
          </div>

          {/* Drop zone / file picker */}
          {!pending && (
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 rounded-xl px-6 py-8 cursor-pointer transition group">
              <svg className="w-8 h-8 text-gray-300 dark:text-gray-600 group-hover:text-blue-400 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <span className="text-sm text-gray-400 dark:text-gray-500 group-hover:text-blue-500 transition">
                Click to select a <strong>.json</strong> backup file
              </span>
              <input
                ref={fileRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="sr-only"
              />
            </label>
          )}

          {/* Parse error */}
          {parseError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <svg className="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <p className="text-sm text-red-600">{parseError}</p>
            </div>
          )}

          {/* Success */}
          {successMsg && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
              <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-green-700 font-medium">{successMsg}</p>
            </div>
          )}

          {/* Backup preview + actions */}
          {pending && summary && (
            <div className="space-y-4">

              {/* Summary card */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="bg-gray-100 dark:bg-gray-700 px-4 py-2.5 flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">Backup contents</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
                    {new Date(summary.exportedAt).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-px bg-gray-200 dark:bg-gray-700 md:grid-cols-3">
                  {[
                    { label: 'Statements',           value: summary.statementCount },
                    { label: 'Manual transactions',  value: summary.manualCount },
                    { label: 'Categorization rules', value: summary.ruleCount },
                    { label: 'Budget entries',       value: summary.budgetCount },
                    { label: 'Goals',                value: summary.goalCount },
                    { label: 'Assets',               value: summary.assetCount ?? 0 },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-white dark:bg-gray-900 px-4 py-3">
                      <p className="text-xl font-bold text-gray-800 dark:text-gray-100">{value}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Replace warning */}
              <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
                <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  <strong>Replace</strong> wipes all current data and restores from this backup.
                  <strong> Merge</strong> adds new entries without touching your existing ones.
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleRestore('merge')}
                  className="flex-1 py-2.5 rounded-xl border border-blue-200 text-sm font-medium text-blue-600 hover:bg-blue-50 transition"
                >
                  Merge with existing
                </button>
                <button
                  onClick={() => handleRestore('replace')}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition"
                >
                  Replace all data
                </button>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
