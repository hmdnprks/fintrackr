/* eslint-disable @typescript-eslint/no-explicit-any */
import { getVaultData, saveVaultData, VaultData } from '@/lib/storage/secureStorage'

const BACKUP_VERSION = 4

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
    assets: any[]
    netWorthSnapshots: any[]
    assetSnapshots: any[]
    rebalanceHistory: any[]
    learnedRules: any[]
    transactionLabels: Record<string, string>
  }
}

export type BackupSummary = {
  exportedAt: string
  statementCount: number
  manualCount: number
  ruleCount: number
  budgetCount: number
  goalCount: number
  assetCount: number
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
      assets:             vault.assets ?? [],
      netWorthSnapshots:  vault.netWorthSnapshots ?? [],
      assetSnapshots:     vault.assetSnapshots ?? [],
      rebalanceHistory:   vault.rebalanceHistory ?? [],
      learnedRules:       vault.learnedRules ?? [],
      transactionLabels:  vault.transactionLabels ?? {},
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
    assetCount:     (backup.data.assets || []).length,
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

  const assets = backup.data.assets ?? []
  const netWorthSnapshots = backup.data.netWorthSnapshots ?? []
  const assetSnapshots = backup.data.assetSnapshots ?? []

  const rebalanceHistory   = backup.data.rebalanceHistory   ?? []
  const learnedRules       = backup.data.learnedRules       ?? []
  const transactionLabels  = backup.data.transactionLabels  ?? {}

  if (mode === 'replace') {
    await saveVaultData({
      statements: backup.data.statements,
      manualTransactions: backup.data.manualTransactions,
      rules: backup.data.rules,
      budgets: backup.data.budgets,
      goals,
      assets,
      netWorthSnapshots,
      assetSnapshots,
      rebalanceHistory,
      learnedRules,
      transactionLabels,
    })
    return
  }

  // Merge — deduplicate by id, backup wins on budgets
  const existingVault = await getVaultData()
  
  const existingStatements = existingVault.statements || []
  const existingManual = existingVault.manualTransactions || []
  const existingRules = existingVault.rules || []
  const existingBudgets = existingVault.budgets || {}
  const existingGoals  = existingVault.goals  || []
  const existingAssets = existingVault.assets || []

  const existingStatementIds = new Set(existingStatements.map((s: any) => s.id))
  const existingManualIds    = new Set(existingManual.map((t: any) => t.id))
  const existingRuleIds      = new Set(existingRules.map((r: any) => r.id))
  const existingGoalIds      = new Set(existingGoals.map((g: any) => g.id))
  const existingAssetIds     = new Set(existingAssets.map((a: any) => a.id))

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
    ],
    assets: [
      ...existingAssets,
      ...assets.filter((a) => !existingAssetIds.has(a.id)),
    ],
    // Merge net worth snapshots by date — backup wins on same day
    netWorthSnapshots: [
      ...(existingVault.netWorthSnapshots ?? []).filter(
        (s: any) => !netWorthSnapshots.find((b: any) => b.date === s.date)
      ),
      ...netWorthSnapshots,
    ].sort((a: any, b: any) => a.date.localeCompare(b.date)),
    // Merge per-asset snapshots by assetId+date — backup wins on same day
    assetSnapshots: [
      ...(existingVault.assetSnapshots ?? []).filter(
        (s: any) => !assetSnapshots.find((b: any) => b.assetId === s.assetId && b.date === s.date)
      ),
      ...assetSnapshots,
    ].sort((a: any, b: any) => a.date.localeCompare(b.date)),
    // Merge rebalance history by id — deduplicate, keep latest 5
    rebalanceHistory: [
      ...(existingVault.rebalanceHistory ?? []).filter(
        (e: any) => !rebalanceHistory.find((b: any) => b.id === e.id)
      ),
      ...rebalanceHistory,
    ].sort((a: any, b: any) => a.savedAt.localeCompare(b.savedAt)).slice(-5),
    // Merge labels — backup wins on same key
    transactionLabels: { ...(existingVault.transactionLabels ?? {}), ...transactionLabels },
    // Merge learned rules by normalizedDesc — backup wins on same key
    learnedRules: [
      ...(existingVault.learnedRules ?? []).filter(
        (r: any) => !learnedRules.find((b: any) => b.normalizedDesc === r.normalizedDesc)
      ),
      ...learnedRules,
    ],
  }

  await saveVaultData(newVaultState)
}
