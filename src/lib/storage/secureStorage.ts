/* eslint-disable @typescript-eslint/no-explicit-any */

import { encryptData, decryptData } from '@/lib/security/encryption'

const VAULT_KEY = 'fintrackr_vault'
const META_KEY = 'fintrackr_meta'

let sessionPassword: string | null = null

// ============================
// Vault Status
// ============================

export function isVaultInitialized() {
  if (typeof window === 'undefined') return false
  return !!localStorage.getItem(META_KEY)
}

export function isVaultUnlocked() {
  return !!sessionPassword
}

export function lockVault() {
  sessionPassword = null
}

// ============================
// Initialize Vault
// ============================

export async function initializeVault(password: string) {
  const emptyData: any[] = []

  const encrypted = await encryptData(emptyData, password)

  localStorage.setItem(VAULT_KEY, JSON.stringify(encrypted))
  localStorage.setItem(
    META_KEY,
    JSON.stringify({ createdAt: new Date().toISOString() })
  )

  sessionPassword = password
}

// ============================
// Unlock Vault
// ============================

export async function unlockVault(password: string) {
  const encrypted = localStorage.getItem(VAULT_KEY)
  if (!encrypted) throw new Error('Vault not found')

  try {
    await decryptData(JSON.parse(encrypted), password)
    sessionPassword = password
    return true
  } catch {
    throw new Error('Invalid password')
  }
}

// ============================
// Get Data
// ============================

export async function getSecureStatements() {
  if (!sessionPassword) throw new Error('Vault locked')

  const encrypted = localStorage.getItem(VAULT_KEY)
  if (!encrypted) return []

  const decrypted = await decryptData(
    JSON.parse(encrypted),
    sessionPassword
  )

  return decrypted
}

// ============================
// Save Data
// ============================

export async function saveSecureStatements(data: any[]) {
  if (!sessionPassword) throw new Error('Vault locked')

  const encrypted = await encryptData(data, sessionPassword)

  localStorage.setItem(VAULT_KEY, JSON.stringify(encrypted))
}

export async function changeMasterPassword(
  currentPassword: string,
  newPassword: string
) {
  const encrypted = localStorage.getItem(VAULT_KEY)
  if (!encrypted) throw new Error('Vault not found')

  // Try decrypting with current password
  let decrypted

  try {
    decrypted = await decryptData(
      JSON.parse(encrypted),
      currentPassword
    )
  } catch {
    throw new Error('Current password is incorrect')
  }

  // Re-encrypt with new password
  const reEncrypted = await encryptData(
    decrypted,
    newPassword
  )

  localStorage.setItem(
    VAULT_KEY,
    JSON.stringify(reEncrypted)
  )

  sessionPassword = newPassword
}

