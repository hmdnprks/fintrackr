'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import {
  ArrowUpTrayIcon,
  Squares2X2Icon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline'
import DarkModeToggle from '@/components/DarkModeToggle'

const NAV_LINKS = [
  { href: '/',          label: 'Import',    Icon: ArrowUpTrayIcon  },
  { href: '/dashboard', label: 'Dashboard', Icon: Squares2X2Icon   },
  { href: '/settings',  label: 'Settings',  Icon: Cog6ToothIcon    },
]

export default function NavBar() {
  const pathname = usePathname()

  return (
    <>
      {/* Top nav — always visible; on mobile shows logo only */}
      <nav className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Image alt="Fintrackr" src="/logo-fintrackr.png" height={60} width={90} />

          {/* Desktop links */}
          <div className="hidden sm:flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`transition ${
                  pathname === href
                    ? 'text-blue-600 font-medium'
                    : 'hover:text-blue-600 dark:hover:text-blue-400'
                }`}
              >
                {label}
              </Link>
            ))}
            <DarkModeToggle />
          </div>

          {/* Mobile: dark mode toggle in top bar */}
          <div className="sm:hidden">
            <DarkModeToggle />
          </div>
        </div>
      </nav>

      {/* Mobile bottom navigation bar */}
      <nav
        className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex">
          {NAV_LINKS.map(({ href, label, Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs transition ${
                  active ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="w-6 h-6" />
                <span className={active ? 'font-medium' : ''}>{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

    </>
  )
}
