/* eslint-disable @typescript-eslint/no-explicit-any */
import { getVaultDataSync, saveVaultData } from './storage/secureStorage'

export function getSavedStatements() {
  return getVaultDataSync().statements
}

export async function saveStatement(data: any) {
  const existing = getSavedStatements()

  const updated = [
    ...existing,
    {
      id: crypto.randomUUID(),
      importedAt: new Date().toISOString(),
      ...data,
    },
  ]

  await saveVaultData({ statements: updated })
}

export async function deleteStatementsByMonth(monthKey: string) {
  const existing = getSavedStatements()

  const filtered = existing.filter((s: any) => {
    const match = s.accountSummary?.period?.match(
      /\/(\d{2})\/(\d{2})/
    )

    if (!match) return true

    const month = match[1]
    const year = '20' + match[2]
    const key = `${year}-${month}`

    return key !== monthKey
  })

  await saveVaultData({ statements: filtered })
}

export async function clearAllStatements() {
  await saveVaultData({ statements: [] })
}
