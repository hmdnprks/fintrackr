/* eslint-disable @typescript-eslint/no-explicit-any */
import { getVaultData, saveVaultData, VaultData } from '@/lib/storage/secureStorage'

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

export async function exportBackup(): Promise<BackupData> {
  const vault = await getVaultData()
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    app: 'fintrackr',
    data: {
      statements:         vault.statements,
      manualTransactions: vault.manualTransactions,
      rules:              vault.rules,
      budgets:            vault.budgets,
      goals:              vault.goals,
    },
  }
}

export async function downloadBackup() {
  const backup = await exportBackup()
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
    statementCount: backup.data.statements?.length || 0,
    manualCount:    backup.data.manualTransactions?.length || 0,
    ruleCount:      backup.data.rules?.length || 0,
    budgetCount:    Object.keys(backup.data.budgets || {}).length,
    goalCount:      (backup.data.goals || []).length,
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

export async function restoreBackup(backup: BackupData, mode: 'replace' | 'merge') {
  const goals = backup.data.goals ?? []

  if (mode === 'replace') {
    await saveVaultData({
      statements: backup.data.statements,
      manualTransactions: backup.data.manualTransactions,
      rules: backup.data.rules,
      budgets: backup.data.budgets,
      goals: goals
    })
    return
  }

  // Merge — deduplicate by id, backup wins on budgets
  const existingVault = await getVaultData()
  
  const existingStatements = existingVault.statements || []
  const existingManual = existingVault.manualTransactions || []
  const existingRules = existingVault.rules || []
  const existingBudgets = existingVault.budgets || {}
  const existingGoals = existingVault.goals || []

  const existingStatementIds = new Set(existingStatements.map((s: any) => s.id))
  const existingManualIds    = new Set(existingManual.map((t: any) => t.id))
  const existingRuleIds      = new Set(existingRules.map((r: any) => r.id))
  const existingGoalIds      = new Set(existingGoals.map((g: any) => g.id))

  const newVaultState: Partial<VaultData> = {
    statements: [
      ...existingStatements,
      ...backup.data.statements.filter((s) => !existingStatementIds.has(s.id)),
    ],
    manualTransactions: [
      ...existingManual,
      ...backup.data.manualTransactions.filter((t) => !existingManualIds.has(t.id)),
    ],
    rules: [
      ...existingRules,
      ...backup.data.rules.filter((r) => !existingRuleIds.has(r.id)),
    ],
    budgets: { ...existingBudgets, ...backup.data.budgets },
    goals: [
      ...existingGoals,
      ...goals.filter((g) => !existingGoalIds.has(g.id)),
    ]
  }

  await saveVaultData(newVaultState)
}
