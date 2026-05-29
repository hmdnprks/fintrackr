'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Category, CategoryRule, defaultRules,
  getUserRules, saveUserRules, deleteUserRule,
} from '@/lib/categories'
import { changeMasterPassword, getVaultDataSync, saveVaultData } from '@/lib/storage/secureStorage'
import PasswordStrength from '@/components/PasswordStrength'
import BackupSection from '@/components/settings/BackupSection'

const CHAT_KEY = 'fintrackr_chat_api_key'

const CATEGORIES: Category[] = [
  'Income', 'Food & Dining', 'Groceries', 'Shopping', 'Services',
  'Transportation', 'Health & Medical', 'Entertainment', 'Education',
  'Housing', 'Insurance', 'Bank Charges', 'Transfer', 'Uncategorized',
]

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  ) : (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function PasswordInput({
  value, onChange, onKeyDown, placeholder,
}: {
  value: string
  onChange: (v: string) => void
  onKeyDown?: (e: React.KeyboardEvent) => void
  placeholder: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="w-full border border-gray-200 px-3 py-2.5 pr-10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
        tabIndex={-1}
      >
        <EyeIcon open={show} />
      </button>
    </div>
  )
}

export default function SettingsPage() {
  // ── categorization rules ───────────────────────────────────────────────────
  const [userRules, setUserRules] = useState<CategoryRule[]>(() =>
    typeof window !== 'undefined' ? getUserRules() : []
  )
  const [keyword, setKeyword]   = useState('')
  const [category, setCategory] = useState<Category>('Uncategorized')
  const [showDefaults, setShowDefaults] = useState(false)

  function handleAddRule() {
    if (!keyword.trim()) return
    const rule: CategoryRule = { id: crypto.randomUUID(), keyword: keyword.trim(), category }
    const updated = [...userRules, rule]
    setUserRules(updated)
    saveUserRules(updated)
    setKeyword('')
  }

  function handleDeleteRule(id: string) {
    deleteUserRule(id)
    setUserRules(getUserRules())
  }

  // ── AI chat key ────────────────────────────────────────────────────────────
  const [chatApiKey, setChatApiKey] = useState(() =>
    typeof window !== 'undefined' ? getVaultDataSync().settings?.chatApiKey ?? '' : ''
  )
  const [chatKeySaved, setChatKeySaved] = useState(false)

  async function handleSaveChatKey() {
    const currentSettings = getVaultDataSync().settings || {}
    await saveVaultData({ settings: { ...currentSettings, chatApiKey } })
    setChatKeySaved(true)
    setTimeout(() => setChatKeySaved(false), 2500)
  }

  // ── master password ────────────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword]         = useState('')
  const [pwSuccess, setPwSuccess] = useState('')
  const [pwError, setPwError]     = useState('')

  async function handleChangePassword() {
    setPwSuccess('')
    setPwError('')
    try {
      await changeMasterPassword(currentPassword, newPassword)
      setPwSuccess('Password updated successfully.')
      setCurrentPassword('')
      setNewPassword('')
    } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      setPwError(e.message)
    }
  }

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-6">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Categorization rules, AI config, security &amp; data
            </p>
          </div>
          <Link
            href="/dashboard"
            className="text-sm font-medium text-gray-500 hover:text-gray-800 flex items-center gap-1.5 transition shrink-0"
          >
            Dashboard
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>

        {/* ── 1. Categorization Rules ────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Categorization Rules</h2>
            <p className="text-sm text-gray-400 mt-0.5">
              Keywords matched against transaction descriptions. Your rules override defaults.
            </p>
          </div>

          {/* Add form */}
          <div className="px-6 py-5 border-b border-gray-100">
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Keyword  (e.g. GRAB, NETFLIX)"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddRule()}
                className="flex-1 border border-gray-200 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="border border-gray-200 px-3 py-2.5 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <button
                onClick={handleAddRule}
                disabled={!keyword.trim()}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl text-sm font-medium transition"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add
              </button>
            </div>
          </div>

          {/* User rules list */}
          {userRules.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-gray-400">No custom rules yet. Add one above.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {userRules.map((rule) => (
                <div key={rule.id} className="flex items-center justify-between px-6 py-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-gray-800">{rule.keyword}</span>
                    <span className="text-gray-300">→</span>
                    <span className="text-gray-500">{rule.category}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteRule(rule.id)}
                    title="Delete rule"
                    className="text-gray-300 hover:text-red-500 transition p-1"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Default rules — collapsible */}
          <div className="border-t border-gray-100">
            <button
              onClick={() => setShowDefaults((v) => !v)}
              className="w-full flex items-center justify-between px-6 py-3.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition"
            >
              <span>{showDefaults ? 'Hide' : 'Show'} {defaultRules.length} system default rules</span>
              <svg
                className={`w-4 h-4 transition-transform ${showDefaults ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>

            {showDefaults && (
              <div className="divide-y divide-gray-50 border-t border-gray-100">
                {defaultRules.map((rule) => (
                  <div key={rule.id} className="flex items-center gap-2 px-6 py-3 text-sm">
                    <span className="font-medium text-gray-600">{rule.keyword}</span>
                    <span className="text-gray-300">→</span>
                    <span className="text-gray-400">{rule.category}</span>
                    <span className="ml-auto text-xs text-gray-300 bg-gray-100 px-2 py-0.5 rounded-full">default</span>
                  </div>
                ))}
                <div className="px-6 py-3">
                  <p className="text-xs text-gray-400">Default rules cannot be deleted. Your rules take priority.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── 2. AI Features ────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">AI Features</h2>
            <p className="text-sm text-gray-400 mt-0.5">
              AI categorization and insights via DeepSeek — fully optional.
            </p>
          </div>

          <div className="px-6 py-5 space-y-5">
            {/* Data notice */}
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <p className="text-sm text-amber-800">
                <span className="font-semibold">AI features send data externally.</span>{' '}
                Transaction descriptions and amounts are sent to DeepSeek&apos;s API. Account numbers are not included. AI features are opt-in.
              </p>
            </div>

            {/* Unified API key */}
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-0.5">Your DeepSeek API Key</p>
                <p className="text-xs text-gray-400 mb-3">
                  Powers AI categorization, insights, and chat. Stored only on this device — never sent to anyone except DeepSeek.{' '}
                  <a
                    href="https://platform.deepseek.com/api_keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    Get a free key →
                  </a>
                </p>
                <div className="flex gap-3">
                  <input
                    type="password"
                    value={chatApiKey}
                    onChange={(e) => { setChatApiKey(e.target.value); setChatKeySaved(false) }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveChatKey()}
                    placeholder="sk-..."
                    className="flex-1 border border-gray-200 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleSaveChatKey}
                    disabled={!chatApiKey.trim()}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                      chatKeySaved
                        ? 'bg-green-600 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white'
                    }`}
                  >
                    {chatKeySaved ? (
                      <span className="flex items-center gap-1.5">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                        Saved
                      </span>
                    ) : 'Save'}
                  </button>
                </div>
              </div>

              {chatApiKey && (
                <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-100 px-3 py-2 rounded-xl">
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  API key is set — AI features are active in the dashboard.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── 3. Security ───────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Security</h2>
            <p className="text-sm text-gray-400 mt-0.5">Change your vault master password.</p>
          </div>

          <div className="px-6 py-5 space-y-4">
            <PasswordInput
              value={currentPassword}
              onChange={setCurrentPassword}
              placeholder="Current password"
            />
            <PasswordInput
              value={newPassword}
              onChange={setNewPassword}
              onKeyDown={(e) => e.key === 'Enter' && handleChangePassword()}
              placeholder="New password"
            />

            {newPassword && <PasswordStrength password={newPassword} />}

            <button
              onClick={handleChangePassword}
              disabled={!currentPassword || !newPassword}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl text-sm font-medium transition"
            >
              Update Password
            </button>

            {pwSuccess && (
              <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 px-4 py-3 rounded-xl">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {pwSuccess}
              </div>
            )}
            {pwError && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-3 rounded-xl">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                {pwError}
              </div>
            )}
          </div>
        </div>

        {/* ── 4. Data ───────────────────────────────────────────────────── */}
        <BackupSection />

      </div>
    </main>
  )
}
