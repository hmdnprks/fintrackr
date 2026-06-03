import { getVaultDataSync, saveVaultData } from './storage/secureStorage'

export type LiabilityType = 'mortgage' | 'vehicle_loan' | 'personal_loan' | 'credit_card' | 'other'

export interface Liability {
  id: string
  type: LiabilityType
  name: string               // e.g. "KPR BCA - Rumah Depok"
  institution: string        // e.g. "Bank BCA"
  originalAmount: number     // original loan amount in IDR
  remainingBalance: number   // current outstanding balance in IDR
  monthlyInstallment?: number
  interestRate?: number      // % p.a.
  startDate?: string         // YYYY-MM
  endDate?: string           // YYYY-MM (maturity/payoff date)
  linkedAssetId?: string     // optional link to a vehicle/property asset
  notes?: string
  updatedAt: string
  createdAt: string
}

export type NewLiability = Omit<Liability, 'id' | 'createdAt'>

export function getLiabilities(): Liability[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((getVaultDataSync() as any).liabilities ?? []) as Liability[]
}

export async function addLiability(liability: NewLiability): Promise<Liability> {
  const entry: Liability = { ...liability, id: crypto.randomUUID(), createdAt: new Date().toISOString() }
  await saveVaultData({ liabilities: [...getLiabilities(), entry] })
  return entry
}

export async function updateLiability(id: string, updates: Partial<Liability>): Promise<void> {
  await saveVaultData({
    liabilities: getLiabilities().map((l) => (l.id === id ? { ...l, ...updates } : l)),
  })
}

export async function deleteLiability(id: string): Promise<void> {
  await saveVaultData({ liabilities: getLiabilities().filter((l) => l.id !== id) })
}
