'use client'

import { useEffect, useRef, useState } from 'react'
import {
  downloadBackup,
  exportBackup,
  validateBackup,
  restoreBackup,
  getBackupSummary,
  type BackupData,
  type BackupSummary,
} from '@/lib/backup'
import { getVaultDataSync, saveVaultData } from '@/lib/storage/secureStorage'
import {
  getStoredToken,
  clearToken,
  requestGoogleToken,
  findBackupFile,
  uploadToDrive,
  downloadFromDrive,
  type DriveFileInfo,
} from '@/lib/google/driveSync'

export default function BackupSection({ onRestored }: { onRestored?: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null)

  // Local backup/restore state
  const [pending, setPending]       = useState<BackupData | null>(null)
  const [summary, setSummary]       = useState<BackupSummary | null>(null)
  const [parseError, setParseError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Google Drive state
  const [gisReady, setGisReady]           = useState(false)
  const [driveToken, setDriveToken]       = useState<string | null>(null)
  const [driveFile, setDriveFile]         = useState<DriveFileInfo | null>(null)
  const [driveLoading, setDriveLoading]   = useState(false)
  const [driveMsg, setDriveMsg]           = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // Load GIS script once
  useEffect(() => {
    if (typeof window === 'undefined') return

    const existing = document.getElementById('gis-script')
    if (existing) {
      setGisReady(true)
      return
    }

    const script = document.createElement('script')
    script.id = 'gis-script'
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => setGisReady(true)
    document.body.appendChild(script)

    return () => {
      // keep the script in DOM so it survives re-renders
    }
  }, [])

  // Check for existing session token on mount and load file info
  useEffect(() => {
    const token = getStoredToken()
    if (!token) return
    setDriveToken(token)
    findBackupFile(token)
      .then((f) => setDriveFile(f))
      .catch(() => {/* silent */})
  }, [])

  function flashDriveMsg(type: 'ok' | 'err', text: string) {
    setDriveMsg({ type, text })
    setTimeout(() => setDriveMsg(null), 4000)
  }

  async function handleConnect() {
    if (!gisReady) return
    setDriveLoading(true)
    try {
      const token = await requestGoogleToken()
      setDriveToken(token)
      const file = await findBackupFile(token)
      setDriveFile(file)
      flashDriveMsg('ok', file ? 'Connected — backup found in Drive.' : 'Connected — no existing backup found.')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (!msg.includes('popup_closed')) flashDriveMsg('err', msg)
    } finally {
      setDriveLoading(false)
    }
  }

  async function handleSaveToDrive() {
    if (!driveToken) return
    setDriveLoading(true)
    try {
      const backup = await exportBackup()
      const info = await uploadToDrive(driveToken, JSON.stringify(backup, null, 2))
      setDriveFile(info)
      const cur = getVaultDataSync().settings ?? {}
      await saveVaultData({ settings: { ...cur, lastBackupAt: new Date().toISOString() } })
      flashDriveMsg('ok', 'Backup saved to Google Drive.')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg === 'auth_expired') {
        setDriveToken(null)
        flashDriveMsg('err', 'Session expired — please reconnect.')
      } else {
        flashDriveMsg('err', `Save failed: ${msg}`)
      }
    } finally {
      setDriveLoading(false)
    }
  }

  async function handleRestoreFromDrive() {
    if (!driveToken || !driveFile) return
    setDriveLoading(true)
    setParseError('')
    setSuccessMsg('')
    try {
      const raw = await downloadFromDrive(driveToken, driveFile.id)
      const parsed = JSON.parse(raw)
      if (!validateBackup(parsed)) {
        flashDriveMsg('err', 'Downloaded file is not a valid Fintrackr backup.')
        return
      }
      setPending(parsed)
      setSummary(getBackupSummary(parsed))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg === 'auth_expired') {
        setDriveToken(null)
        flashDriveMsg('err', 'Session expired — please reconnect.')
      } else {
        flashDriveMsg('err', `Download failed: ${msg}`)
      }
    } finally {
      setDriveLoading(false)
    }
  }

  function handleDisconnect() {
    clearToken()
    setDriveToken(null)
    setDriveFile(null)
    setDriveMsg(null)
  }

  // Local file restore handlers
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

  const driveConnected = !!driveToken

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

        {/* Google Drive */}
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
              {/* Google Drive icon */}
              <svg className="w-4 h-4" viewBox="0 0 87.3 78" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Google Drive sync</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {driveConnected && driveFile
                  ? `Last saved: ${new Date(driveFile.modifiedTime).toLocaleDateString('en-US', { dateStyle: 'medium' })}`
                  : driveConnected
                  ? 'Connected — no backup found in Drive yet'
                  : 'Save & restore backups via your private app folder in Google Drive'}
              </p>
            </div>
            {driveConnected ? (
              <button
                onClick={handleDisconnect}
                className="text-xs text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition"
              >
                Disconnect
              </button>
            ) : (
              <button
                onClick={handleConnect}
                disabled={driveLoading || !gisReady}
                className="flex items-center gap-1.5 text-sm font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 px-3.5 py-2 rounded-xl transition disabled:opacity-50 shrink-0"
              >
                {driveLoading ? (
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                  </svg>
                )}
                Connect
              </button>
            )}
          </div>

          {/* Drive actions — shown when connected */}
          {driveConnected && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveToDrive}
                disabled={driveLoading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium transition"
              >
                {driveLoading ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                  </svg>
                )}
                Save to Drive
              </button>
              {driveFile && (
                <button
                  onClick={handleRestoreFromDrive}
                  disabled={driveLoading}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 text-gray-700 dark:text-gray-300 text-sm font-medium transition"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9.75v6.75m0 0l-3-3m3 3l3-3m-8.25 6a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                  </svg>
                  Restore from Drive
                </button>
              )}
            </div>
          )}

          {/* Drive status message */}
          {driveMsg && (
            <div className={`flex items-center gap-2 rounded-xl px-4 py-3 ${
              driveMsg.type === 'ok'
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800'
            }`}>
              {driveMsg.type === 'ok' ? (
                <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              )}
              <p className={`text-sm font-medium ${driveMsg.type === 'ok' ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {driveMsg.text}
              </p>
            </div>
          )}
        </div>

        {/* Restore from file */}
        <div className="px-6 py-5 space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Restore from file</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Select a previously exported Fintrackr backup file.
            </p>
          </div>

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

          {parseError && (
            <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl px-4 py-3">
              <svg className="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <p className="text-sm text-red-600 dark:text-red-400">{parseError}</p>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-xl px-4 py-3">
              <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-green-700 dark:text-green-400 font-medium">{successMsg}</p>
            </div>
          )}

          {pending && summary && (
            <div className="space-y-4">
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

              <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
                <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  <strong>Replace</strong> wipes all current data and restores from this backup.
                  <strong> Merge</strong> adds new entries without touching your existing ones.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleRestore('merge')}
                  className="flex-1 py-2.5 rounded-xl border border-blue-200 dark:border-blue-700 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition"
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
