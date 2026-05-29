const GOALS_KEY = 'fintrackr_goals'

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
  if (typeof window === 'undefined') return []
  return JSON.parse(localStorage.getItem(GOALS_KEY) || '[]')
}

export function addGoal(goal: Omit<Goal, 'id' | 'createdAt'>): Goal {
  const entry = { ...goal, id: crypto.randomUUID(), createdAt: new Date().toISOString() } as Goal
  localStorage.setItem(GOALS_KEY, JSON.stringify([...getGoals(), entry]))
  return entry
}

export function deleteGoal(id: string) {
  localStorage.setItem(GOALS_KEY, JSON.stringify(getGoals().filter((g) => g.id !== id)))
}
