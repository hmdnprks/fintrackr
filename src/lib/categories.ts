/* eslint-disable @typescript-eslint/no-explicit-any */

export type Category =
  | 'Income'
  | 'Food & Dining'
  | 'Groceries'
  | 'Shopping'
  | 'Services'
  | 'Transportation'
  | 'Health & Medical'
  | 'Entertainment'
  | 'Education'
  | 'Housing'
  | 'Insurance'
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
  // Income
  { id: '1',  keyword: 'DARI',        category: 'Income' },
  { id: '2',  keyword: 'Bunga',       category: 'Income' },
  { id: '3',  keyword: 'Gaji',        category: 'Income' },

  // Food & Dining
  { id: '6',  keyword: 'COFFEE',      category: 'Food & Dining' },
  { id: '7',  keyword: 'Warung',      category: 'Food & Dining' },
  { id: '21', keyword: 'Resto',       category: 'Food & Dining' },
  { id: '22', keyword: 'Restaurant',  category: 'Food & Dining' },
  { id: '23', keyword: 'GoFood',      category: 'Food & Dining' },
  { id: '24', keyword: 'GrabFood',    category: 'Food & Dining' },
  { id: '25', keyword: 'ShopeeFood',  category: 'Food & Dining' },
  { id: '26', keyword: 'Kopi',        category: 'Food & Dining' },

  // Groceries
  { id: '4',  keyword: 'IDM',         category: 'Groceries' },
  { id: '5',  keyword: 'ALGO',        category: 'Groceries' },
  { id: '30', keyword: 'Alfamart',    category: 'Groceries' },
  { id: '31', keyword: 'Indomaret',   category: 'Groceries' },
  { id: '32', keyword: 'Superindo',   category: 'Groceries' },
  { id: '33', keyword: 'Hypermart',   category: 'Groceries' },
  { id: '34', keyword: 'Carrefour',   category: 'Groceries' },
  { id: '35', keyword: 'Giant',       category: 'Groceries' },
  { id: '36', keyword: 'Minimarket',  category: 'Groceries' },
  { id: '37', keyword: 'Ranch Market',category: 'Groceries' },

  // Shopping
  { id: '8',  keyword: 'Tokopedia',   category: 'Shopping' },
  { id: '40', keyword: 'Shopee',      category: 'Shopping' },
  { id: '41', keyword: 'Lazada',      category: 'Shopping' },
  { id: '42', keyword: 'Blibli',      category: 'Shopping' },
  { id: '43', keyword: 'Bukalapak',   category: 'Shopping' },
  { id: '44', keyword: 'Zalora',      category: 'Shopping' },

  // Transportation
  { id: '50', keyword: 'Gojek',       category: 'Transportation' },
  { id: '51', keyword: 'Grab',        category: 'Transportation' },
  { id: '52', keyword: 'inDrive',     category: 'Transportation' },
  { id: '53', keyword: 'Maxim',       category: 'Transportation' },
  { id: '54', keyword: 'Toll',        category: 'Transportation' },
  { id: '55', keyword: 'Parkir',      category: 'Transportation' },
  { id: '56', keyword: 'Bensin',      category: 'Transportation' },
  { id: '57', keyword: 'Pertamina',   category: 'Transportation' },
  { id: '58', keyword: 'KAI',         category: 'Transportation' },
  { id: '59', keyword: 'Transjakarta',category: 'Transportation' },

  // Housing & Utilities
  { id: '60', keyword: 'PLN',         category: 'Housing' },
  { id: '61', keyword: 'PDAM',        category: 'Housing' },
  { id: '62', keyword: 'Listrik',     category: 'Housing' },
  { id: '63', keyword: 'Sewa',        category: 'Housing' },
  { id: '64', keyword: 'Kontrakan',   category: 'Housing' },
  { id: '65', keyword: 'Indihome',    category: 'Housing' },
  { id: '66', keyword: 'Biznet',      category: 'Housing' },
  { id: '67', keyword: 'MyRepublic',  category: 'Housing' },

  // Services (telco, subscriptions)
  { id: '70', keyword: 'Telkomsel',   category: 'Services' },
  { id: '71', keyword: 'Indosat',     category: 'Services' },
  { id: '72', keyword: 'XL',          category: 'Services' },
  { id: '73', keyword: 'Axis',        category: 'Services' },
  { id: '74', keyword: 'Tri',         category: 'Services' },
  { id: '75', keyword: 'Traveloka',   category: 'Services' },
  { id: '76', keyword: 'Tiket.com',   category: 'Services' },

  // Entertainment
  { id: '80', keyword: 'Netflix',     category: 'Entertainment' },
  { id: '81', keyword: 'Spotify',     category: 'Entertainment' },
  { id: '82', keyword: 'YouTube',     category: 'Entertainment' },
  { id: '83', keyword: 'Disney',      category: 'Entertainment' },
  { id: '84', keyword: 'Vidio',       category: 'Entertainment' },
  { id: '85', keyword: 'Steam',       category: 'Entertainment' },
  { id: '86', keyword: 'Games',       category: 'Entertainment' },

  // Health
  { id: '90', keyword: 'Apotek',      category: 'Health & Medical' },
  { id: '91', keyword: 'Kimia Farma', category: 'Health & Medical' },
  { id: '92', keyword: 'K24',         category: 'Health & Medical' },
  { id: '93', keyword: 'Klinik',      category: 'Health & Medical' },
  { id: '94', keyword: 'Rumah Sakit', category: 'Health & Medical' },
  { id: '95', keyword: 'Halodoc',     category: 'Health & Medical' },
  { id: '96', keyword: 'Alodokter',   category: 'Health & Medical' },

  // Transfer / E-wallets
  { id: '100', keyword: 'GoPay',      category: 'Transfer' },
  { id: '101', keyword: 'OVO',        category: 'Transfer' },
  { id: '102', keyword: 'DANA',       category: 'Transfer' },
  { id: '103', keyword: 'ShopeePay',  category: 'Transfer' },
  { id: '104', keyword: 'LinkAja',    category: 'Transfer' },

  // Bank Charges
  { id: '9',   keyword: 'Biaya Adm',  category: 'Bank Charges' },
  { id: '110', keyword: 'Biaya Transfer', category: 'Bank Charges' },
  { id: '111', keyword: 'Denda',      category: 'Bank Charges' },
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
