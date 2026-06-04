import { Category, getAllRules } from "@/lib/categories";

export function categorizeTransaction(
  detail: string,
  type: 'credit' | 'debit' | undefined
): Category {
  const rules = getAllRules()

  for (const rule of rules) {
    const regex = new RegExp(rule.keyword, 'i')
    if (regex.test(detail)) {
      // Income rules must never fire on debit transactions
      if (rule.category === 'Income' && type === 'debit') continue
      return rule.category
    }
  }

  // ✅ Smart fallback
  if (type === 'credit') {
    return 'Income'
  }

  return 'Uncategorized'
}
