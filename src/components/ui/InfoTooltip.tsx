'use client'

import { useState, useRef, useEffect } from 'react'
import { InformationCircleIcon } from '@heroicons/react/24/outline'

interface Props {
  content: React.ReactNode
  className?: string
  align?: 'left' | 'right'
}

export default function InfoTooltip({ content, className, align = 'left' }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  return (
    <div className={`relative inline-flex items-center ${className ?? ''}`} ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(v => !v) }}
        className="text-gray-400 hover:text-blue-500 dark:text-gray-500 dark:hover:text-blue-400 transition-colors"
        aria-label="More information"
      >
        <InformationCircleIcon className="w-4 h-4" />
      </button>

      {open && (
        <div
          className={`absolute z-50 top-full mt-1.5 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-3 text-xs text-gray-600 dark:text-gray-300 leading-relaxed ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {content}
        </div>
      )}
    </div>
  )
}
