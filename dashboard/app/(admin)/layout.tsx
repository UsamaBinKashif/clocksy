import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/profiles'
import { SignOutButton } from '@/components/sign-out-button'
import { SidebarNav } from '@/components/sidebar-nav'
import { BrandLockup } from '@/components/brand'
import { ThemeToggle } from '@/components/ui/theme-toggle'

export default async function AdminLayout({
  children
}: {
  children: ReactNode
}): Promise<JSX.Element> {
  const profile = await getProfile()

  if (!profile || profile.role !== 'admin') {
    redirect('/me')
  }

  return (
    <div className="flex min-h-screen bg-background text-text-primary">
      <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-surface">
        <div className="flex h-14 items-center px-4">
          <BrandLockup subtitle="Admin workspace" />
        </div>

        <SidebarNav />

        <div className="border-t border-border p-3">
          <div className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-text-primary">
                {profile.display_name || 'Admin'}
              </p>
              <p className="text-xs capitalize text-text-muted">
                {profile.role}
              </p>
            </div>
            <ThemeToggle />
          </div>
          <div className="mt-1">
            <SignOutButton />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  )
}
