/* eslint-disable @typescript-eslint/no-explicit-any */

const BACKUP_VERSION = 2

export type BackupData = {
  version: number
  exportedAt: string
  app: 'fintrackr'
  data: {
    statements: any[]
    manualTransactions: any[]
    rules: any[]
    budgets: Record<string, number>
    goals: any[]
  }
}

export type BackupSummary = {
  exportedAt: string
  statementCount: number
  manualCount: number
  ruleCount: number
  budgetCount: number
  goalCount: number
}

export function exportBackup(): BackupData {
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    app: 'fintrackr',
    data: {
      statements:         JSON.parse(localStorage.getItem('fintrackr')         || '[]'),
      manualTransactions: JSON.parse(localStorage.getItem('fintrackr_manual')  || '[]'),
      rules:              JSON.parse(localStorage.getItem('fintrackr_rules')   || '[]'),
      budgets:            JSON.parse(localStorage.getItem('fintrackr_budgets') || '{}'),
      goals:              JSON.parse(localStorage.getItem('fintrackr_goals')   || '[]'),
    },
  }
}

export function downloadBackup() {
  const backup = exportBackup()
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `fintrackr-backup-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function getBackupSummary(backup: BackupData): BackupSummary {
  return {
    exportedAt:     backup.exportedAt,
    statementCount: backup.data.statements.length,
    manualCount:    backup.data.manualTransactions.length,
    ruleCount:      backup.data.rules.length,
    budgetCount:    Object.keys(backup.data.budgets).length,
    goalCount:      (backup.data.goals ?? []).length,
  }
}

export function validateBackup(raw: any): raw is BackupData {
  return (
    raw &&
    raw.app === 'fintrackr' &&
    typeof raw.version === 'number' &&
    raw.data &&
    Array.isArray(raw.data.statements) &&
    Array.isArray(raw.data.manualTransactions) &&
    Array.isArray(raw.data.rules) &&
    typeof raw.data.budgets === 'object'
    // goals is optional for v1 backup compatibility
  )
}

export function restoreBackup(backup: BackupData, mode: 'replace' | 'merge') {
  const goals = backup.data.goals ?? []

  if (mode === 'replace') {
    localStorage.setItem('fintrackr',         JSON.stringify(backup.data.statements))
    localStorage.setItem('fintrackr_manual',  JSON.stringify(backup.data.manualTransactions))
    localStorage.setItem('fintrackr_rules',   JSON.stringify(backup.data.rules))
    localStorage.setItem('fintrackr_budgets', JSON.stringify(backup.data.budgets))
    localStorage.setItem('fintrackr_goals',   JSON.stringify(goals))
    return
  }

  // Merge — deduplicate by id, backup wins on budgets
  const existingStatements: any[] = JSON.parse(localStorage.getItem('fintrackr')         || '[]')
  const existingManual:     any[] = JSON.parse(localStorage.getItem('fintrackr_manual')  || '[]')
  const existingRules:      any[] = JSON.parse(localStorage.getItem('fintrackr_rules')   || '[]')
  const existingBudgets:    Record<string, number> = JSON.parse(localStorage.getItem('fintrackr_budgets') || '{}')
  const existingGoals:      any[] = JSON.parse(localStorage.getItem('fintrackr_goals')   || '[]')

  const existingStatementIds = new Set(existingStatements.map((s) => s.id))
  const existingManualIds    = new Set(existingManual.map((t) => t.id))
  const existingRuleIds      = new Set(existingRules.map((r) => r.id))
  const existingGoalIds      = new Set(existingGoals.map((g) => g.id))

  localStorage.setItem('fintrackr',
    JSON.stringify([
      ...existingStatements,
      ...backup.data.statements.filter((s) => !existingStatementIds.has(s.id)),
    ])
  )
  localStorage.setItem('fintrackr_manual',
    JSON.stringify([
      ...existingManual,
      ...backup.data.manualTransactions.filter((t) => !existingManualIds.has(t.id)),
    ])
  )
  localStorage.setItem('fintrackr_rules',
    JSON.stringify([
      ...existingRules,
      ...backup.data.rules.filter((r) => !existingRuleIds.has(r.id)),
    ])
  )
  localStorage.setItem('fintrackr_budgets',
    JSON.stringify({ ...existingBudgets, ...backup.data.budgets })
  )
  localStorage.setItem('fintrackr_goals',
    JSON.stringify([
      ...existingGoals,
      ...goals.filter((g) => !existingGoalIds.has(g.id)),
    ])
  )
}
