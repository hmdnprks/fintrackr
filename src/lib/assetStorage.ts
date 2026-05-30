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
  contributable?: boolean  // false = auto-managed, can't manually deposit (e.g. JHT, BPJS)
  goalName?: string        // pocket: what is this for
  goalTarget?: number      // pocket: target IDR
  goalDeadline?: string    // pocket: YYYY-MM
  notes?: string
  updatedAt: string        // ISO — when was the value last updated
  createdAt: string
}

export type NewAsset = Omit<Asset, 'id' | 'createdAt'>

export type NetWorthSnapshot = { date: string; value: number }

export function getAssets(): Asset[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((getVaultDataSync() as any).assets ?? []) as Asset[]
}

export function getNetWorthSnapshots(): NetWorthSnapshot[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((getVaultDataSync() as any).netWorthSnapshots ?? []) as NetWorthSnapshot[]
}

// Records today's net worth. At most one entry per day — updates in place if today already exists.
async function recordSnapshot(updatedAssets: Asset[]): Promise<void> {
  const total = updatedAssets.reduce((s, a) => s + (a.currentValue || 0), 0)
  const today = new Date().toISOString().split('T')[0]
  const existing = getNetWorthSnapshots()
  const withoutToday = existing.filter(s => s.date !== today)
  const snapshots = [...withoutToday, { date: today, value: total }]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-365)  // keep at most 1 year of daily snapshots
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await saveVaultData({ netWorthSnapshots: snapshots } as any)
}

export async function saveAsset(asset: NewAsset): Promise<Asset> {
  const all = getAssets()
  const created: Asset = { ...asset, id: crypto.randomUUID(), createdAt: new Date().toISOString() }
  const updated = [...all, created]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await saveVaultData({ assets: updated } as any)
  await recordSnapshot(updated)
  return created
}

export async function updateAsset(id: string, updates: Partial<NewAsset>): Promise<void> {
  const updated = getAssets().map(a => a.id === id ? { ...a, ...updates } : a)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await saveVaultData({ assets: updated } as any)
  await recordSnapshot(updated)
}

export async function deleteAsset(id: string): Promise<void> {
  const updated = getAssets().filter(a => a.id !== id)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await saveVaultData({ assets: updated } as any)
  await recordSnapshot(updated)
}
