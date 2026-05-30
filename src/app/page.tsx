/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { Squares2X2Icon, ShieldCheckIcon } from '@heroicons/react/24/outline'
import { getSavedStatements, saveStatement } from '@/lib/storage'
import VaultGate from '@/components/VaultGate'
import StatementGuide from '@/components/home/StatementGuide'
import FileUploadZone from '@/components/home/FileUploadZone'
import ParseResultPreview from '@/components/home/ParseResultPreview'
import BatchProgress, { BatchItem } from '@/components/home/BatchProgress'

function extractMonthKey(period: string): string | null {
  const match = period?.match(/\/(\d{2})\/(\d{2})/)
  if (!match) return null
  return `20${match[2]}-${match[1]}`
}

function monthKeyToLabel(mk: string): string {
  const [y, m] = mk.split('-').map(Number)
  return new Date(y, m - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })
}

async function parseFile(file: File, password: string): Promise<any> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('password', password)
  const res  = await fetch('/api/parse-pdf', { method: 'POST', body: formData })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Parse failed')
  return data
}

export default function Home() {
  // ── shared ─────────────────────────────────────────────────────────────────
  const [files, setFiles]   = useState<File[]>([])
  const [error, setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // ── single-file mode ───────────────────────────────────────────────────────
  const [result, setResult]             = useState<any>(null)
  const [saved, setSaved]               = useState(false)
  const [showDupWarning, setShowDupWarning] = useState(false)

  // ── batch mode ─────────────────────────────────────────────────────────────
  const [batchItems, setBatchItems]     = useState<BatchItem[]>([])
  const [batchRunning, setBatchRunning] = useState(false)

  const isBatchMode = files.length > 1
  const hasBatchResult = batchItems.length > 0

  const onFilesChange = useCallback((newFiles: File[]) => {
    setFiles(newFiles)
    setError(null)
    setResult(null)
    setSaved(false)
    setShowDupWarning(false)
    setBatchItems([])
  }, [])

  // ── single parse + preview ─────────────────────────────────────────────────
  async function handleSingleParse(password: string) {
    if (!files[0]) return
    setLoading(true)
    setError(null)
    setResult(null)
    setSaved(false)
    setShowDupWarning(false)
    try {
      const data = await parseFile(files[0], password)
      setResult(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleSave(force = false) {
    if (!result) return
    if (!force) {
      const mk = extractMonthKey(result.accountSummary?.period ?? '')
      if (mk) {
        const dup = getSavedStatements().some(
          (s: any) => extractMonthKey(s.accountSummary?.period ?? '') === mk
        )
        if (dup) { setShowDupWarning(true); return }
      }
    }
    saveStatement(result)
    setSaved(true)
    setShowDupWarning(false)
  }

  // ── batch import ───────────────────────────────────────────────────────────
  async function handleBatch(password: string) {
    setBatchRunning(true)
    setError(null)

    const items: BatchItem[] = files.map((f) => ({ file: f, status: 'pending' }))
    setBatchItems([...items])

    for (let i = 0; i < files.length; i++) {
      items[i] = { ...items[i], status: 'processing' }
      setBatchItems([...items])

      try {
        const data = await parseFile(files[i], password)

        const mk = extractMonthKey(data.accountSummary?.period ?? '')
        if (mk) {
          const isDup = getSavedStatements().some(
            (s: any) => extractMonthKey(s.accountSummary?.period ?? '') === mk
          )
          if (isDup) {
            items[i] = { ...items[i], status: 'duplicate', period: monthKeyToLabel(mk) }
            setBatchItems([...items])
            continue
          }
        }

        saveStatement(data)
        items[i] = {
          ...items[i],
          status: 'saved',
          period: mk ? monthKeyToLabel(mk) : files[i].name,
          txCount: data.transactions?.length ?? 0,
        }
        setBatchItems([...items])
      } catch (err: any) {
        items[i] = { ...items[i], status: 'error', error: err.message }
        setBatchItems([...items])
      }
    }

    setBatchRunning(false)
    setFiles([])
  }

  function handleSubmit(password: string) {
    if (isBatchMode) {
      handleBatch(password)
    } else {
      handleSingleParse(password)
    }
  }

  return (
    <VaultGate>
      <main className="min-h-screen bg-gray-50 py-6 px-4 sm:py-10 sm:px-6">
        <div className="max-w-3xl mx-auto space-y-6">

          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Import Statement</h1>
              <p className="text-sm text-gray-400 mt-0.5">Upload Mandiri PDF bank statements</p>
            </div>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-blue-600 bg-white border border-gray-200 hover:border-blue-300 px-3 py-2 rounded-xl transition shrink-0"
            >
              <Squares2X2Icon className="w-4 h-4" />
              <span className="hidden sm:inline">Go to Dashboard</span>
              <span className="sm:hidden">Dashboard</span>
            </Link>
          </div>

          <StatementGuide />

          {/* Privacy notice */}
          <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4">
            <ShieldCheckIcon className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-800">Your data never leaves your device</p>
              <p className="text-sm text-blue-600 mt-0.5">
                Fintrackr stores everything locally in your browser — no server, no database, no cloud.
              </p>
            </div>
          </div>

          {/* Upload zone — hidden while batch is running or complete */}
          {!hasBatchResult && (
            <FileUploadZone
              files={files}
              onFilesChange={onFilesChange}
              loading={loading || batchRunning}
              onSubmit={handleSubmit}
              error={error}
            />
          )}

          {/* Batch progress */}
          {hasBatchResult && (
            <BatchProgress items={batchItems} isRunning={batchRunning} />
          )}

          {/* Batch done — option to import more */}
          {hasBatchResult && !batchRunning && (
            <div className="text-center">
              <button
                onClick={() => { setBatchItems([]); setFiles([]) }}
                className="text-sm text-blue-600 hover:underline"
              >
                ← Import more statements
              </button>
            </div>
          )}

          {/* Single file preview */}
          {result?.success && !isBatchMode && (
            <ParseResultPreview
              result={result}
              saved={saved}
              showDupWarning={showDupWarning}
              onSave={handleSave}
              onCancelDup={() => setShowDupWarning(false)}
            />
          )}

        </div>
      </main>
    </VaultGate>
  )
}
