'use client'

import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function LoginContent() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] flex items-center justify-center font-mono">
      <div className="w-full max-w-sm">
        <div className="border border-[#e0e0e0] dark:border-[#2a2a2a] p-8">
          <div className="mb-8">
            <div className="text-[10px] text-[#bbb] dark:text-[#444] tracking-[0.3em] uppercase mb-2">
              Crackd
            </div>
            <h1 className="text-xl text-[#0a0a0a] dark:text-white tracking-tight">
              Prompt Chain Tool
            </h1>
            <p className="text-xs text-[#aaa] dark:text-[#555] mt-1">
              Superadmin or Matrix Admin access required
            </p>
          </div>

          {error === 'unauthorized' && (
            <div className="mb-6 border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-3">
              <p className="text-red-600 dark:text-red-400 text-xs">
                Access denied. Superadmin or Matrix Admin privileges required.
              </p>
            </div>
          )}

          <button
            onClick={handleGoogleLogin}
            className="w-full border border-[#ddd] dark:border-[#333] hover:border-[#0a0a0a] dark:hover:border-white hover:bg-[#0a0a0a] dark:hover:bg-white hover:text-white dark:hover:text-black text-[#0a0a0a] dark:text-white text-xs tracking-widest uppercase py-3 px-4 transition-all duration-150"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}
