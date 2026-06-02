'use client'

import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { InformationCircleIcon } from '@heroicons/react/24/outline'

interface Props {
  content: React.ReactNode
  className?: string
  align?: 'left' | 'right'
}

export default function InfoTooltip({ content, className, align = 'left' }: Props) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  // Shift the popover horizontally so it stays within the viewport.
  // Mutates the DOM node directly (no setState) to avoid a cascading render.
  // useLayoutEffect fires before the browser paints so there is no visual flash.
  useLayoutEffect(() => {
    const el = popoverRef.current
    if (!open || !el) return
    el.style.transform = ''
    const rect = el.getBoundingClientRect()
    const vw = window.innerWidth
    const MARGIN = 8
    if (rect.right > vw - MARGIN) {
      el.style.transform = `translateX(${-(rect.right - (vw - MARGIN))}px)`
    } else if (rect.left < MARGIN) {
      el.style.transform = `translateX(${MARGIN - rect.left}px)`
    }
  }, [open])

  return (
    <div className={`relative inline-flex items-center ${className ?? ''}`} ref={wrapRef}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(v => !v) }}
        className="text-gray-400 hover:text-blue-500 dark:text-gray-500 dark:hover:text-blue-400 transition-colors"
        aria-label="More information"
      >
        <InformationCircleIcon className="w-4 h-4" />
      </button>

      {open && (
        <div
          ref={popoverRef}
          className={`absolute z-50 top-full mt-1.5 w-72 max-w-[calc(100vw-1rem)] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-3 text-xs text-gray-600 dark:text-gray-300 leading-relaxed ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {content}
        </div>
      )}
    </div>
  )
}
