/* eslint-disable @typescript-eslint/no-explicit-any */

const STORAGE_KEY = 'fintrackr'

export function getSavedStatements() {
  if (typeof window === 'undefined') return []
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
}

export function saveStatement(data: any) {
  const existing = getSavedStatements()

  const updated = [
    ...existing,
    {
      id: crypto.randomUUID(),
      importedAt: new Date().toISOString(),
      ...data,
    },
  ]

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
}

export function deleteStatementsByMonth(monthKey: string) {
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

  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
}


export function clearAllStatements() {
  localStorage.removeItem(STORAGE_KEY)
}

