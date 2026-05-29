import { getVaultDataSync, saveVaultData } from './storage/secureStorage'

export type AssetType = 'savings' | 'gold' | 'investment' | 'pocket' | 'other'

export interface Asset {
  id: string
  type: AssetType
  name: string
  institution: string
  currentValue: number     // always in IDR
  interestRate?: number    // % p.a., savings accounts
  isEmergencyFund?: boolean
  goldGrams?: number       // optional display field for gold
  platform?: string        // investment platform e.g. "Bibit"
  goalName?: string        // pocket: what is this for
  goalTarget?: number      // pocket: target IDR
  goalDeadline?: string    // pocket: YYYY-MM
  notes?: string
  updatedAt: string        // ISO — when was the value last updated
  createdAt: string
}

export type NewAsset = Omit<Asset, 'id' | 'createdAt'>

export function getAssets(): Asset[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((getVaultDataSync() as any).assets ?? []) as Asset[]
}

export async function saveAsset(asset: NewAsset): Promise<Asset> {
  const all = getAssets()
  const created: Asset = {
    ...asset,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await saveVaultData({ assets: [...all, created] } as any)
  return created
}

export async function updateAsset(id: string, updates: Partial<NewAsset>): Promise<void> {
  const all = getAssets()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await saveVaultData({ assets: all.map(a => a.id === id ? { ...a, ...updates } : a) } as any)
}

export async function deleteAsset(id: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await saveVaultData({ assets: getAssets().filter(a => a.id !== id) } as any)
}
