/* eslint-disable @typescript-eslint/no-explicit-any */

const MANUAL_KEY = 'fintrackr_manual'

export type ManualTransaction = {
  id: string
  transactionDate: string
  detail: string
  amount: number
  type: 'debit' | 'credit'
  category: string
  createdAt: string
}

export function getManualTransactions(): ManualTransaction[] {
  if (typeof window === 'undefined') return []
  return JSON.parse(localStorage.getItem(MANUAL_KEY) || '[]')
}

export function addManualTransaction(tx: Omit<ManualTransaction, 'id' | 'createdAt'>) {
  const existing = getManualTransactions()
  const entry: ManualTransaction = {
    ...tx,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }
  const updated = [...existing, entry]
  localStorage.setItem(MANUAL_KEY, JSON.stringify(updated))
  return entry
}

export function deleteManualTransaction(id: string) {
  const existing = getManualTransactions()
  const updated = existing.filter((t) => t.id !== id)
  localStorage.setItem(MANUAL_KEY, JSON.stringify(updated))
}

export function updateManualTransaction(
  id: string,
  updates: Partial<ManualTransaction>
) {
  const existing = getManualTransactions()
  const updated = existing.map((t) =>
    t.id === id ? { ...t, ...updates } : t
  )
  localStorage.setItem(MANUAL_KEY, JSON.stringify(updated))
}
