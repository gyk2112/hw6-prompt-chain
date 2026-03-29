import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export const revalidate = 60

export default async function HomePage() {
  const supabase = await createClient()

  const [{ count: flavorCount }, { count: stepCount }] = await Promise.all([
    supabase.from('humor_flavors').select('*', { count: 'exact', head: true }),
    supabase.from('humor_flavor_steps').select('*', { count: 'exact', head: true }),
  ])

  const stats = [
    { label: 'Humor Flavors', value: flavorCount ?? 0, href: '/humor-flavors' },
    { label: 'Flavor Steps', value: stepCount ?? 0, href: '/humor-flavors' },
  ]

  return (
    <div className="space-y-10">
      <div>
        <div className="text-[10px] text-[#bbb] dark:text-[#444] tracking-[0.3em] uppercase mb-1">
          Crackd
        </div>
        <h1 className="text-2xl text-[#0a0a0a] dark:text-white tracking-tight">
          Prompt Chain Tool
        </h1>
        <p className="text-xs text-[#888] dark:text-[#555] mt-1">
          Manage humor flavors and prompt chains
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 max-w-sm">
        {stats.map(({ label, value, href }) => (
          <Link
            key={label}
            href={href}
            className="border border-[#ebebeb] dark:border-[#1e1e1e] p-5 hover:border-[#0a0a0a] dark:hover:border-[#444] transition-colors group"
          >
            <div className="text-2xl text-[#0a0a0a] dark:text-white font-mono tabular-nums mb-1">
              {value}
            </div>
            <div className="text-[10px] text-[#aaa] dark:text-[#555] tracking-widest uppercase group-hover:text-[#888] dark:group-hover:text-[#777] transition-colors">
              {label}
            </div>
          </Link>
        ))}
      </div>

      <div className="space-y-4 max-w-lg">
        <div className="text-[10px] text-[#bbb] dark:text-[#444] tracking-[0.3em] uppercase">
          Quick actions
        </div>
        <div className="space-y-2">
          <Link
            href="/humor-flavors"
            className="flex items-center justify-between border border-[#ebebeb] dark:border-[#1e1e1e] px-4 py-3 hover:border-[#0a0a0a] dark:hover:border-[#444] transition-colors group"
          >
            <span className="text-xs text-[#0a0a0a] dark:text-white tracking-wide">
              Manage Humor Flavors
            </span>
            <span className="text-[#ccc] dark:text-[#444] group-hover:text-[#0a0a0a] dark:group-hover:text-white transition-colors">
              →
            </span>
          </Link>
          <Link
            href="/captions"
            className="flex items-center justify-between border border-[#ebebeb] dark:border-[#1e1e1e] px-4 py-3 hover:border-[#0a0a0a] dark:hover:border-[#444] transition-colors group"
          >
            <span className="text-xs text-[#0a0a0a] dark:text-white tracking-wide">
              View Generated Captions
            </span>
            <span className="text-[#ccc] dark:text-[#444] group-hover:text-[#0a0a0a] dark:group-hover:text-white transition-colors">
              →
            </span>
          </Link>
        </div>
      </div>
    </div>
  )
}
