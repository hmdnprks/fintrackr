'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'

const NAV_LINKS = [
  { href: '/',          label: 'Import'    },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/settings',  label: 'Settings'  },
]

export default function NavBar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  // Close menu on route change
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setOpen(false) }, [pathname])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  return (
    <>
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Image alt="Fintrackr" src="/logo-fintrackr.png" height={60} width={90} />

          {/* Desktop links */}
          <div className="hidden sm:flex gap-6 text-sm text-gray-600">
            {NAV_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`transition ${
                  pathname === link.href
                    ? 'text-blue-600 font-medium'
                    : 'hover:text-blue-600'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setOpen(v => !v)}
            className="sm:hidden p-2 -mr-2 text-gray-500 hover:text-gray-900 transition"
            aria-label="Toggle menu"
          >
            {open
              ? <XMarkIcon className="w-5 h-5" />
              : <Bars3Icon className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile dropdown */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-30 bg-black/20 sm:hidden"
            onClick={() => setOpen(false)}
          />
          {/* Menu panel */}
          <div className="fixed top-14 left-0 right-0 z-40 bg-white border-b border-gray-100 shadow-lg sm:hidden">
            {NAV_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`flex items-center px-6 py-4 text-sm border-b border-gray-50 last:border-0 transition ${
                  pathname === link.href
                    ? 'text-blue-600 font-semibold bg-blue-50'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </>
      )}
    </>
  )
}
