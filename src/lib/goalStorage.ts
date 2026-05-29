import { getVaultDataSync, saveVaultData } from './storage/secureStorage'

export type SavingsGoal = {
  id: string
  type: 'savings'
  targetAmount: number
  deadline: string   // "YYYY-MM"
  startMonth: string // "YYYY-MM"
  createdAt: string
}

export type SpendingGoal = {
  id: string
  type: 'spending'
  category: string
  monthlyLimit: number
  targetMonths: number
  createdAt: string
}

export type Goal = SavingsGoal | SpendingGoal

export function getGoals(): Goal[] {
  return getVaultDataSync().goals
}

type NewGoal = Omit<SavingsGoal, 'id' | 'createdAt'> | Omit<SpendingGoal, 'id' | 'createdAt'>

export async function addGoal(goal: NewGoal): Promise<Goal> {
  const entry = { ...goal, id: crypto.randomUUID(), createdAt: new Date().toISOString() } as Goal
  await saveVaultData({ goals: [...getGoals(), entry] })
  return entry
}

export async function deleteGoal(id: string) {
  await saveVaultData({ goals: getGoals().filter((g) => g.id !== id) })
}
