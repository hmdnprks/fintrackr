export type BudgetMap = Record<string, number>

const BUDGET_KEY = 'fintrackr_budgets'

export function getBudgets(): BudgetMap {
  if (typeof window === 'undefined') return {}
  return JSON.parse(localStorage.getItem(BUDGET_KEY) || '{}')
}

export function setBudget(category: string, amount: number) {
  const existing = getBudgets()
  if (amount <= 0) {
    delete existing[category]
  } else {
    existing[category] = amount
  }
  localStorage.setItem(BUDGET_KEY, JSON.stringify(existing))
}

export function clearBudgets() {
  localStorage.removeItem(BUDGET_KEY)
}
