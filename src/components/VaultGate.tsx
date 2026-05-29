'use client'

import { useState, useRef } from 'react'
import { useVault } from '@/context/VaultContext'
import PasswordStrength from '@/components/PasswordStrength'

function EyeToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      tabIndex={-1}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
    >
      {show ? (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )}
    </button>
  )
}

export default function VaultGate({ children }: { children: React.ReactNode }) {
  const { initialized, unlocked, unlock, initialize } = useVault()

  const [password, setPassword]             = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword]     = useState(false)
  const [showConfirm, setShowConfirm]       = useState(false)
  const [error, setError]                   = useState('')
  const [isLoading, setIsLoading]           = useState(false)
  const confirmRef = useRef<HTMLInputElement>(null)

  // Fix 10 — initialized is never null with useSyncExternalStore
  if (unlocked) return <>{children}</>

  const passwordsMatch = !confirmPassword || password === confirmPassword
  const canSubmit = !isLoading && !!password && (
    initialized
      ? true
      : !!confirmPassword && password === confirmPassword
  )

  async function handleSubmit() {
    if (!canSubmit) return
    setIsLoading(true)
    setError('')
    try {
      if (!initialized) {
        await initialize(password)
      } else {
        await unlock(password)
      }
    } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      setError(e.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-sm w-full max-w-sm overflow-hidden">

        {/* Fix 7 — app branding + header */}
        <div className="bg-blue-600 px-6 py-5 text-white">
          <p className="text-xs font-bold tracking-widest uppercase text-blue-300 mb-3">
            Fintrackr
          </p>
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            <span className="font-semibold text-lg">
              {initialized ? 'Unlock Vault' : 'Create Your Vault'}
            </span>
          </div>
          <p className="text-blue-100 text-xs">
            {initialized
              ? 'Your data is encrypted and stored on this device only.'
              : 'Your data will be encrypted locally — never sent to any server.'}
          </p>
        </div>

        <div className="px-6 py-5 space-y-4">

          {/* Fix 3 — password with show/hide */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Master Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder={initialized ? 'Enter your password' : 'Choose a strong password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError('') }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (initialized) handleSubmit()
                    else confirmRef.current?.focus()
                  }
                }}
                autoFocus
                className="w-full border border-gray-200 px-3 py-2.5 pr-10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <EyeToggle show={showPassword} onToggle={() => setShowPassword((v) => !v)} />
            </div>
          </div>

          {/* Fix 1 — confirm password for create flow */}
          {!initialized && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    ref={confirmRef}
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setError('') }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    className={`w-full border px-3 py-2.5 pr-10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      confirmPassword && !passwordsMatch
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-200'
                    }`}
                  />
                  <EyeToggle show={showConfirm} onToggle={() => setShowConfirm((v) => !v)} />
                </div>
                {confirmPassword && !passwordsMatch && (
                  <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                )}
              </div>

              {/* Fix 4 — password strength */}
              {password && <PasswordStrength password={password} />}
            </>
          )}

          {/* Fix 8 — proper error banner */}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
              <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Fix 2 & 6 — loading state + disabled when empty */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white py-2.5 rounded-xl text-sm font-semibold transition"
          >
            {isLoading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {initialized ? 'Unlocking…' : 'Creating vault…'}
              </>
            ) : (
              initialized ? 'Unlock' : 'Create Vault'
            )}
          </button>

          {/* Fix 5 — relevant warnings for each flow */}
          {!initialized ? (
            <p className="text-xs text-gray-400 text-center leading-relaxed">
              This password encrypts all your data using AES-256.
              It is never stored or transmitted anywhere.{' '}
              <strong className="text-gray-500">Keep it safe — it cannot be recovered.</strong>
            </p>
          ) : (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
              <svg className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <p className="text-xs text-amber-700 leading-relaxed">
                Forgot your password? Your encrypted data cannot be recovered without it.
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
