'use client'

import { createContext, useContext, useState } from 'react'
import {
  isVaultInitialized,
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

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const [initialized] = useState(isVaultInitialized())
  const [unlocked, setUnlocked] = useState(false)

  async function handleUnlock(password: string) {
    await unlockVault(password)
    setUnlocked(true)
  }

  async function handleInitialize(password: string) {
    await initializeVault(password)
    setUnlocked(true)
  }

  function handleLock() {
    lockVault()
    setUnlocked(false)
  }

  return (
    <VaultContext.Provider
      value={{
        initialized,
        unlocked,
        unlock: handleUnlock,
        initialize: handleInitialize,
        lock: handleLock,
      }}
    >
      {children}
    </VaultContext.Provider>
  )
}

export function useVault() {
  const ctx = useContext(VaultContext)
  if (!ctx) throw new Error('VaultProvider missing')
  return ctx
}
