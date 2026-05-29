/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState } from 'react'
import { useVault } from '@/context/VaultContext'

export default function VaultGate({
  children,
}: {
  children: React.ReactNode
}) {
  const { initialized, unlocked, unlock, initialize } = useVault()

  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit() {
    try {
      if (!initialized) {
        await initialize(password)
      } else {
        await unlock(password)
      }
    } catch (e: any) {
      setError(e.message)
    }
  }

  if (initialized === null) return null
  if (unlocked) return <>{children}</>

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-2xl shadow w-full max-w-sm space-y-4">

        <h2 className="text-xl font-semibold text-center">
          {initialized ? 'Unlock Vault' : 'Create Vault'}
        </h2>

        <input
          type="password"
          placeholder="Master Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border p-3 rounded-lg text-sm"
        />

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          className="w-full bg-blue-600 text-white py-3 rounded-lg text-sm"
        >
          {initialized ? 'Unlock' : 'Create Vault'}
        </button>
      </div>
    </div>
  )
}
