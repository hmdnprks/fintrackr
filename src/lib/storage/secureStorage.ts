/* eslint-disable @typescript-eslint/no-explicit-any */

import { encryptData, decryptData } from '@/lib/security/encryption'
import { idbGet, idbSet } from '@/lib/storage/indexedDB'

const VAULT_KEY = 'fintrackr_vault'
const META_KEY = 'fintrackr_meta'

let sessionPassword: string | null = null
let vaultCache: VaultData | null = null

// The unified structure for all data in the vault
export type VaultData = {
  statements: any[]
  manualTransactions: any[]
  rules: any[]
  budgets: Record<string, number>
  goals: any[]
  assets: any[]
  netWorthSnapshots: { date: string; value: number }[]
  assetSnapshots: { assetId: string; date: string; value: number }[]
  settings: Record<string, string> // e.g. chat API keys
  rebalanceHistory: any[]          // last 5 RebalanceSavedEntry objects
}

const defaultVaultData: VaultData = {
  statements: [],
  manualTransactions: [],
  rules: [],
  budgets: {},
  goals: [],
  assets: [],
  netWorthSnapshots: [],
  assetSnapshots: [],
  settings: {},
  rebalanceHistory: [],
}

// ============================
// Vault Status
// ============================

export function isVaultInitialized() {
  if (typeof window === 'undefined') return false
  return !!localStorage.getItem(META_KEY)
}

export function isVaultUnlocked() {
  return sessionPassword !== null
}

export function getSessionPassword(): string | null {
  return sessionPassword
}

export function lockVault() {
  sessionPassword = null
  vaultCache = null
}

// ============================
// Migration Logic
// ============================

async function getRawEncryptedVault(): Promise<string | null> {
  if (typeof window === 'undefined') return null

  // Check localStorage first for legacy production data
  const legacyData = localStorage.getItem(VAULT_KEY)
  if (legacyData) {
    console.log('[Vault] Found legacy data in localStorage. Migrating to IndexedDB...')
    await idbSet(VAULT_KEY, legacyData)
    localStorage.removeItem(VAULT_KEY)
    return legacyData
  }

  // Fallback to IndexedDB
  return await idbGet(VAULT_KEY)
}

function pullLegacyLocalStorageData(existingVault: VaultData): VaultData {
  if (typeof window === 'undefined') return existingVault

  let migrated = false
  const updated = { ...existingVault }

  const migrateKey = (key: string, field: keyof VaultData, isObj = false) => {
    const data = localStorage.getItem(key)
    if (data) {
      try {
        if (field === 'settings') {
          // handled manually below
        } else if (isObj) {
          updated[field] = { ...updated[field] as Record<string, any>, ...JSON.parse(data) } as any
        } else {
          updated[field] = [...updated[field] as any[], ...JSON.parse(data)] as any
        }
        localStorage.removeItem(key)
        migrated = true
      } catch (e) {
        console.error(`Failed to migrate ${key}`, e)
      }
    }
  }

  migrateKey('fintrackr', 'statements')
  migrateKey('fintrackr_manual', 'manualTransactions')
  migrateKey('fintrackr_rules', 'rules')
  migrateKey('fintrackr_budgets', 'budgets', true)
  migrateKey('fintrackr_goals', 'goals')

  const apiKey = localStorage.getItem('fintrackr_chat_api_key')
  if (apiKey) {
    updated.settings = { ...updated.settings, chatApiKey: apiKey }
    localStorage.removeItem('fintrackr_chat_api_key')
    migrated = true
  }

  return updated
}

// ============================
// Initialize Vault
// ============================

export async function initializeVault(password: string) {
  const initialData = pullLegacyLocalStorageData(defaultVaultData)

  const encrypted = await encryptData(initialData, password)
  await idbSet(VAULT_KEY, JSON.stringify(encrypted))

  localStorage.setItem(
    META_KEY,
    JSON.stringify({ createdAt: new Date().toISOString() })
  )

  sessionPassword = password
  vaultCache = initialData
}

// ============================
// Unlock Vault
// ============================

export async function unlockVault(password: string) {
  const encrypted = await getRawEncryptedVault()
  if (!encrypted) throw new Error('Vault not found')

  let parsed: any;
  try {
    parsed = JSON.parse(encrypted)
  } catch (e: any) {
    throw new Error('Data corruption')
  }

  try {
    let decrypted = await decryptData(parsed, password)

    if (Array.isArray(decrypted)) {
      decrypted = { ...defaultVaultData, statements: decrypted }
    }

    const withLegacy = pullLegacyLocalStorageData(decrypted)
    if (JSON.stringify(decrypted) !== JSON.stringify(withLegacy)) {
      const reEncrypted = await encryptData(withLegacy, password)
      await idbSet(VAULT_KEY, JSON.stringify(reEncrypted))
    }

    sessionPassword = password
    vaultCache = withLegacy
    return true
  } catch (e: any) {
    throw new Error('Invalid password')
  }
}

// ============================
// Get / Save Unified Data
// ============================

export function getVaultDataSync(): VaultData {
  if (!sessionPassword || !vaultCache) return defaultVaultData
  return vaultCache
}

export async function getVaultData(): Promise<VaultData> {
  if (!sessionPassword || !vaultCache) throw new Error('Vault locked')
  return vaultCache
}

export async function saveVaultData(data: Partial<VaultData>) {
  if (!sessionPassword || !vaultCache) throw new Error('Vault locked')

  const updated = { ...vaultCache, ...data }
  vaultCache = updated // Update cache immediately for sync readers

  const encrypted = await encryptData(updated, sessionPassword)
  await idbSet(VAULT_KEY, JSON.stringify(encrypted))
}

export async function changeMasterPassword(
  currentPassword: string,
  newPassword: string
) {
  const encrypted = await getRawEncryptedVault()
  if (!encrypted) throw new Error('Vault not found')

  let decrypted
  try {
    decrypted = await decryptData(JSON.parse(encrypted), currentPassword)
  } catch {
    throw new Error('Current password is incorrect')
  }

  const reEncrypted = await encryptData(decrypted, newPassword)
  await idbSet(VAULT_KEY, JSON.stringify(reEncrypted))
  sessionPassword = newPassword
}
