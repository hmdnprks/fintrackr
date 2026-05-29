/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Import Statement</h1>
              <p className="text-sm text-gray-400 mt-0.5">Upload Mandiri PDF bank statements</p>
            </div>
            <Link
              href="/dashboard"
              className="text-sm font-medium text-gray-500 hover:text-gray-800 flex items-center gap-1.5 transition"
            >
              Dashboard
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>

          <StatementGuide />

          {/* Privacy notice */}
          <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4">
            <svg className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
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
