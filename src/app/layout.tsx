import type { Metadata } from 'next'
import './globals.css'
import { createClient } from '@/lib/supabase/server'
import { NavSidebar } from '@/components/NavSidebar'
import { ThemeProvider } from '@/components/ThemeProvider'

export const metadata: Metadata = {
  title: 'Crackd — Prompt Chain',
  description: 'Humor Flavor Prompt Chain Manager',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-white dark:bg-[#0a0a0a] text-[#0a0a0a] dark:text-white font-mono antialiased">
        <ThemeProvider>
          {!user ? (
            children
          ) : (
            <div className="flex min-h-screen">
              <NavSidebar userEmail={user.email ?? ''} />
              <main className="flex-1 ml-52 p-8 min-h-screen">
                {children}
              </main>
            </div>
          )}
        </ThemeProvider>
      </body>
    </html>
  )
}
