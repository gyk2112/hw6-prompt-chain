'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ThemeToggle } from './ThemeToggle'

const navSections = [
  {
    label: 'Prompt Chain',
    items: [
      { href: '/', label: 'Overview' },
      { href: '/humor-flavors', label: 'Humor Flavors' },
      { href: '/captions', label: 'Captions' },
    ],
  },
]

export function NavSidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-52 border-r border-[#ebebeb] dark:border-[#1e1e1e] bg-[#f9f9f9] dark:bg-[#0a0a0a] flex flex-col overflow-y-auto">
      <div className="p-5 border-b border-[#ebebeb] dark:border-[#1e1e1e]">
        <div className="text-[9px] text-[#bbb] dark:text-[#444] tracking-[0.3em] uppercase mb-1">Crackd</div>
        <div className="text-sm text-[#0a0a0a] dark:text-white tracking-tight font-semibold">Prompt Chain</div>
      </div>

      <nav className="flex-1 p-3 space-y-4">
        {navSections.map(({ label, items }) => (
          <div key={label}>
            <div className="text-[9px] text-[#ccc] dark:text-[#333] tracking-[0.25em] uppercase px-3 mb-1">
              {label}
            </div>
            <div className="space-y-0.5">
              {items.map(({ href, label: itemLabel }) => {
                const active =
                  pathname === href ||
                  (href !== '/' && pathname.startsWith(href))
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`block px-3 py-1.5 text-xs tracking-widest uppercase transition-colors ${
                      active
                        ? 'bg-[#0a0a0a] dark:bg-white text-white dark:text-black'
                        : 'text-[#888] dark:text-[#666] hover:text-[#0a0a0a] dark:hover:text-white hover:bg-[#efefef] dark:hover:bg-[#1a1a1a]'
                    }`}
                  >
                    {itemLabel}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-[#ebebeb] dark:border-[#1e1e1e] space-y-3">
        <ThemeToggle />
        <div className="text-[10px] text-[#bbb] dark:text-[#444] truncate">{userEmail}</div>
        <button
          onClick={handleSignOut}
          className="text-[10px] text-[#bbb] dark:text-[#555] hover:text-red-500 dark:hover:text-red-400 tracking-widest uppercase transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}
