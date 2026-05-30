'use client'
import { useEffect, useState } from 'react'
import { MoonIcon, SunIcon } from '@heroicons/react/24/outline'

export default function DarkModeToggle() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('fintrackr-theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark = stored ? stored === 'dark' : prefersDark
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDark(isDark)
    document.documentElement.classList.toggle('dark', isDark)
  }, [])

  function toggle() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('fintrackr-theme', next ? 'dark' : 'light')
  }

  return (
    <button onClick={toggle} className="p-2 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition" title="Toggle dark mode">
      {dark ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
    </button>
  )
}
