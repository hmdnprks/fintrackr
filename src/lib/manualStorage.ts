/* eslint-disable @typescript-eslint/no-explicit-any */
import { getVaultDataSync, saveVaultData } from './storage/secureStorage'

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
  return getVaultDataSync().manualTransactions
}

export async function addManualTransaction(tx: Omit<ManualTransaction, 'id' | 'createdAt'>): Promise<ManualTransaction> {
  const existing = getManualTransactions()
  const entry: ManualTransaction = {
    ...tx,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }
  const updated = [...existing, entry]
  await saveVaultData({ manualTransactions: updated })
  return entry
}

export async function deleteManualTransaction(id: string) {
  const existing = getManualTransactions()
  const updated = existing.filter((t) => t.id !== id)
  await saveVaultData({ manualTransactions: updated })
}

export async function updateManualTransaction(
  id: string,
  updates: Partial<ManualTransaction>
) {
  const existing = getManualTransactions()
  const updated = existing.map((t) =>
    t.id === id ? { ...t, ...updates } : t
  )
  await saveVaultData({ manualTransactions: updated })
}
