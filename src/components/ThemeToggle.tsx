'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  if (!mounted) return null

  const options = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'Auto' },
  ] as const

  return (
    <div className="flex items-center gap-0.5">
      {options.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={`text-[9px] tracking-widest uppercase px-2 py-1 rounded-sm transition-colors ${
            theme === value
              ? 'bg-[#0a0a0a] dark:bg-white text-white dark:text-black'
              : 'text-[#aaa] dark:text-[#555] hover:text-[#0a0a0a] dark:hover:text-white'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
