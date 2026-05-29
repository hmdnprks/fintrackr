/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState } from 'react'
import {
  Category,
  CategoryRule,
  defaultRules,
  getUserRules,
  saveUserRules,
  deleteUserRule,
} from '@/lib/categories'
import { changeMasterPassword } from '@/lib/storage/secureStorage'
import PasswordStrength from '@/components/PasswordStrength'

const CHAT_KEY_STORAGE = 'fintrackr_chat_api_key'

export default function SettingsPage() {
  const [userRules, setUserRules] = useState<CategoryRule[]>(() => {
    if (typeof window === 'undefined') return []
    return getUserRules()
  })
  const [keyword, setKeyword] = useState('')
  const [category, setCategory] = useState<Category>('Uncategorized')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState('')
  const [aiConfigured, setAiConfigured] = useState(false)
  const [chatApiKey, setChatApiKey] = useState(() => {
    if (typeof window === 'undefined') return ''
    return localStorage.getItem(CHAT_KEY_STORAGE) || ''
  })
  const [chatKeySaved, setChatKeySaved] = useState(false)

  useState(() => {
    setAiConfigured(!!process.env.DEEPSEEK_API_KEY)
  })

  function handleSaveChatKey() {
    localStorage.setItem(CHAT_KEY_STORAGE, chatApiKey)
    setChatKeySaved(true)
    setTimeout(() => setChatKeySaved(false), 2000)
  }



  function handleAddRule() {
    if (!keyword.trim()) return

    const newRule: CategoryRule = {
      id: crypto.randomUUID(),
      keyword,
      category,
    }

    const updated = [...userRules, newRule]

    setUserRules(updated)
    saveUserRules(updated)

    setKeyword('')
  }

  function handleDelete(id: string) {
    deleteUserRule(id)
    setUserRules(getUserRules())
  }

  async function handleChangePassword() {
    try {
      await changeMasterPassword(
        currentPassword,
        newPassword
      )

      setMessage('Password updated successfully.')
      setCurrentPassword('')
      setNewPassword('')
    } catch (e: any) {
      setMessage(e.message)
    }
  }


  return (
    <main className="min-h-screen bg-gray-50 py-10 px-6">
      <div className="max-w-4xl mx-auto space-y-10">

        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            Settings
          </h1>
          <p className="text-gray-500 text-sm">
            Customize transaction categorization
          </p>
        </div>

        {/* Add Rule */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border">
          <h2 className="text-lg font-semibold mb-4">
            Add Custom Rule
          </h2>

          <div className="grid md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Keyword (e.g. MONTHLY CARD)"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="border p-2 rounded-lg text-sm"
            />

            <select
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as Category)
              }
              className="border p-2 rounded-lg text-sm"
            >
              {[
                  'Income',
                  'Food & Dining',
                  'Groceries',
                  'Shopping',
                  'Services',
                  'Transportation',
                  'Health & Medical',
                  'Entertainment',
                  'Education',
                  'Housing',
                  'Insurance',
                  'Bank Charges',
                  'Transfer',
                  'Uncategorized',
                ].map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <button
              onClick={handleAddRule}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
            >
              Add Rule
            </button>
          </div>
        </div>

        {/* User Rules */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border">
          <h2 className="text-lg font-semibold mb-4">
            Your Custom Rules
          </h2>

          {userRules.length === 0 && (
            <p className="text-sm text-gray-500">
              No custom rules yet.
            </p>
          )}

          <div className="space-y-3">
            {userRules.map((rule) => (
              <div
                key={rule.id}
                className="flex justify-between items-center border p-3 rounded-lg text-sm"
              >
                <div>
                  <span className="font-medium">
                    {rule.keyword}
                  </span>
                  <span className="text-gray-400 ml-2">
                    → {rule.category}
                  </span>
                </div>

                <button
                  onClick={() => handleDelete(rule.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Default Rules */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border">
          <h2 className="text-lg font-semibold mb-4">
            System Default Rules
          </h2>

          <div className="grid md:grid-cols-2 gap-3 text-sm">
            {defaultRules.map((rule) => (
              <div
                key={rule.id}
                className="border p-2 rounded-lg"
              >
                <span className="font-medium">
                  {rule.keyword}
                </span>
                <span className="text-gray-400 ml-2">
                  → {rule.category}
                </span>
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-400 mt-4">
            Default rules cannot be deleted. Custom rules
            override them.
          </p>
        </div>

        {/* AI Settings */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border">
          <h2 className="text-lg font-semibold mb-4">
            AI Categorization
          </h2>

          <p className="text-sm text-gray-500 mb-4">
            Transactions categorized as &quot;Uncategorized&quot; can be
            auto-categorized using DeepSeek AI.
          </p>

          <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
            API key is set via <code className="bg-gray-200 px-1 rounded">DEEPSEEK_API_KEY</code> in your <code className="bg-gray-200 px-1 rounded">.env</code> file.
            Currently {aiConfigured ? 'configured' : 'not configured'}.
          </p>
        </div>

        {/* Chat AI Settings */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border">
          <h2 className="text-lg font-semibold mb-4">
            AI Chat Assistant
          </h2>

          <p className="text-sm text-gray-500 mb-4">
            Chat with an AI assistant about your transactions. Uses your own DeepSeek API key.
          </p>

          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">
                DeepSeek API Key
              </label>
              <input
                type="password"
                value={chatApiKey}
                onChange={(e) => {
                  setChatApiKey(e.target.value)
                  setChatKeySaved(false)
                }}
                placeholder="sk-..."
                className="w-full border p-2 rounded-lg text-sm"
              />
            </div>

            <button
              onClick={handleSaveChatKey}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
            >
              {chatKeySaved ? 'Saved' : 'Save'}
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border">
          <h2 className="text-lg font-semibold mb-4">
            Change Master Password
          </h2>

          <div className="space-y-4">

            <input
              type="password"
              placeholder="Current Password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full border p-2 rounded-lg text-sm"
            />

            <input
              type="password"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full border p-2 rounded-lg text-sm"
            />

            <PasswordStrength password={newPassword} />

            <button
              onClick={handleChangePassword}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
            >
              Update Password
            </button>

            {message && (
              <p className="text-sm text-gray-600">{message}</p>
            )}
          </div>
        </div>


      </div>
    </main>
  )
}
