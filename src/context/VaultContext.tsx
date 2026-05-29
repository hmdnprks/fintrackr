'use client'

import { createContext, useContext, useSyncExternalStore, useState } from 'react'
import {
  isVaultInitialized,
  isVaultUnlocked,
  unlockVault,
  initializeVault,
  lockVault,
} from '@/lib/storage/secureStorage'

type VaultContextType = {
  initialized: boolean
  unlocked: boolean
  unlock: (password: string) => Promise<void>
  initialize: (password: string) => Promise<void>
  lock: () => void
}

const VaultContext = createContext<VaultContextType | null>(null)

function subscribeToVaultInit(callback: () => void) {
  window.addEventListener('storage', callback)
  return () => window.removeEventListener('storage', callback)
}

function getVaultInitSnapshot() {
  return isVaultInitialized()
}

function subscribeToSession() {
  return () => {}
}

function getSessionSnapshot() {
  if (typeof window === 'undefined') return false
  return isVaultUnlocked()
}

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const initialized = useSyncExternalStore(
    subscribeToVaultInit,
    getVaultInitSnapshot,
    () => false
  )
  const unlocked = useSyncExternalStore(
    subscribeToSession,
    getSessionSnapshot,
    () => false
  )
  const [hydrated, setHydrated] = useState(false)

  useState(() => {
    setHydrated(true)
  })

  async function handleUnlock(password: string) {
    await unlockVault(password)
  }

  async function handleInitialize(password: string) {
    await initializeVault(password)
  }

  function handleLock() {
    lockVault()
  }

  const value = { initialized, unlocked, unlock: handleUnlock, initialize: handleInitialize, lock: handleLock }

  return (
    <VaultContext.Provider value={value}>
      {hydrated ? children : null}
    </VaultContext.Provider>
  )
}

export function useVault() {
  const ctx = useContext(VaultContext)
  if (!ctx) throw new Error('VaultProvider missing')
  return ctx
}
