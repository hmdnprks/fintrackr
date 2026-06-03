'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useSyncExternalStore, useState } from 'react'
import {
  isVaultInitialized,
  isVaultUnlocked,
  unlockVault,
  initializeVault,
  lockVault,
  getVaultDataSync,
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

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'] as const

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const initialized = useSyncExternalStore(
    subscribeToVaultInit,
    getVaultInitSnapshot,
    () => false
  )
  const [unlocked, setUnlocked] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  const timerRef       = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoLockMsRef  = useRef(0)

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (isVaultUnlocked()) setUnlocked(true)
    setHydrated(true)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [])

  // Stable: only touches refs, no closure over state
  const resetTimer = useCallback(() => {
    if (!autoLockMsRef.current) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      lockVault()
      setUnlocked(false)
    }, autoLockMsRef.current)
  }, [])

  useEffect(() => {
    function teardown() {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = null
      autoLockMsRef.current = 0
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, resetTimer))
    }

    // Reads fresh setting and (re-)starts listeners. Safe to call multiple times.
    function setup() {
      teardown()
      const minutes = Number(getVaultDataSync().settings?.autoLockMinutes ?? 0)
      if (!minutes) return
      autoLockMsRef.current = minutes * 60 * 1000
      ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, resetTimer, { passive: true }))
      resetTimer()
    }

    if (!unlocked) {
      teardown()
      return
    }

    setup()
    // Re-apply when the user changes the setting on the Settings page
    window.addEventListener('fintrackr-autolock-changed', setup)
    return () => {
      teardown()
      window.removeEventListener('fintrackr-autolock-changed', setup)
    }
  }, [unlocked, resetTimer])

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
