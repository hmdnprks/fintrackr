import { getVaultDataSync, saveVaultData } from './storage/secureStorage'

export type BudgetMap = Record<string, number>

export function getBudgets(): BudgetMap {
  return getVaultDataSync().budgets
}

export async function setBudget(category: string, amount: number) {
  const existing = { ...getBudgets() }
  if (amount <= 0) {
    delete existing[category]
  } else {
    existing[category] = amount
  }
  await saveVaultData({ budgets: existing })
}

export async function clearBudgets() {
  await saveVaultData({ budgets: {} })
}
