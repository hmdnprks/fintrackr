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
export type AssetSnapshot   = { assetId: string; date: string; value: number }

export function getAssets(): Asset[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((getVaultDataSync() as any).assets ?? []) as Asset[]
}

export function getNetWorthSnapshots(): NetWorthSnapshot[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((getVaultDataSync() as any).netWorthSnapshots ?? []) as NetWorthSnapshot[]
}

export function getAssetSnapshots(): AssetSnapshot[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((getVaultDataSync() as any).assetSnapshots ?? []) as AssetSnapshot[]
}

// Records today's aggregate net worth + each asset's individual value.
// At most one entry per day per asset — updates in place if today already exists.
async function recordSnapshot(updatedAssets: Asset[]): Promise<void> {
  const today = new Date().toISOString().split('T')[0]

  // ── Aggregate net worth snapshot ──
  const total = updatedAssets.reduce((s, a) => s + (a.currentValue || 0), 0)
  const existingNW = getNetWorthSnapshots().filter(s => s.date !== today)
  const netWorthSnapshots = [...existingNW, { date: today, value: total }]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-365)

  // ── Per-asset snapshots ──
  const updatedIds = new Set(updatedAssets.map(a => a.id))
  const existingAS = getAssetSnapshots()
    .filter(s => !(updatedIds.has(s.assetId) && s.date === today))
  const newEntries: AssetSnapshot[] = updatedAssets.map(a => ({
    assetId: a.id,
    date: today,
    value: a.currentValue,
  }))
  // Group by assetId and keep last 365 days per asset
  const allEntries = [...existingAS, ...newEntries]
    .sort((a, b) => a.date.localeCompare(b.date))
  const byAsset: Record<string, AssetSnapshot[]> = {}
  for (const s of allEntries) {
    if (!byAsset[s.assetId]) byAsset[s.assetId] = []
    byAsset[s.assetId].push(s)
  }
  const assetSnapshots = Object.values(byAsset).flatMap(entries => entries.slice(-365))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await saveVaultData({ netWorthSnapshots, assetSnapshots } as any)
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
