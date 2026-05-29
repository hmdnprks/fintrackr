'use client'

import { useMemo } from 'react'

type Props = {
  password: string
}

function calculateStrength(password: string) {
  let score = 0

  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[a-z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  return score
}

export default function PasswordStrength({ password }: Props) {
  const score = useMemo(
    () => calculateStrength(password),
    [password]
  )

  const labels = [
    'Very Weak',
    'Weak',
    'Fair',
    'Good',
    'Strong',
  ]

  const colors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-yellow-500',
    'bg-blue-500',
    'bg-green-500',
  ]

  if (!password) return null

  return (
    <div className="space-y-2">
      <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-2 transition-all ${colors[score - 1]}`}
          style={{ width: `${(score / 5) * 100}%` }}
        />
      </div>

      <p className="text-xs text-gray-600">
        Strength: {labels[score - 1] || 'Very Weak'}
      </p>
    </div>
  )
}
