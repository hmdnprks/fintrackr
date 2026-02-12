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

export default function SettingsPage() {
  const [userRules, setUserRules] = useState<CategoryRule[]>(() => {
    if (typeof window === 'undefined') return []
    return getUserRules()
  })
  const [keyword, setKeyword] = useState('')
  const [category, setCategory] = useState<Category>('Uncategorized')


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

      </div>
    </main>
  )
}
