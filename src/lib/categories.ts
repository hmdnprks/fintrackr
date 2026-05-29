/* eslint-disable @typescript-eslint/no-explicit-any */

export type Category =
  | 'Income'
  | 'Food & Dining'
  | 'Groceries'
  | 'Shopping'
  | 'Services'
  | 'Bank Charges'
  | 'Transfer'
  | 'Uncategorized'

export type CategoryRule = {
  id: string
  keyword: string
  category: Category
}

const RULES_KEY = 'fintrackr_rules'

export const defaultRules: CategoryRule[] = [
  { id: '1', keyword: 'DARI', category: 'Income' },
  { id: '2', keyword: 'Bunga', category: 'Income' },
  { id: '3', keyword: 'QRIS', category: 'Groceries' },
  { id: '4', keyword: 'IDM', category: 'Groceries' },
  { id: '5', keyword: 'ALGO', category: 'Groceries' },
  { id: '6', keyword: 'COFFEE', category: 'Food & Dining' },
  { id: '7', keyword: 'Warung', category: 'Food & Dining' },
  { id: '8', keyword: 'Tokopedia', category: 'Shopping' },
  { id: '9', keyword: 'Biaya Adm', category: 'Bank Charges' },
]

export function getUserRules(): CategoryRule[] {
  if (typeof window === 'undefined') return []
  return JSON.parse(localStorage.getItem(RULES_KEY) || '[]')
}

export function saveUserRules(rules: CategoryRule[]) {
  localStorage.setItem(RULES_KEY, JSON.stringify(rules))
}

export function deleteUserRule(id: string) {
  const existing = getUserRules()
  const filtered = existing.filter((r) => r.id !== id)
  saveUserRules(filtered)
}

export function getAllRules(): CategoryRule[] {
  return [...getUserRules(), ...defaultRules]
}
