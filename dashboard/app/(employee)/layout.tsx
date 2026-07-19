import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/profiles'
import { SignOutButton } from '@/components/sign-out-button'
import { BrandLockup } from '@/components/brand'
import { ThemeToggle } from '@/components/ui/theme-toggle'

export default async function EmployeeLayout({
  children
}: {
  children: ReactNode
}): Promise<JSX.Element> {
  const profile = await getProfile()

  // Admins belong in the admin shell; employees (or missing profile) stay here.
  if (profile?.role === 'admin') {
    redirect('/admin')
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-text-primary">
      <header className="flex h-14 items-center justify-between border-b border-border bg-surface px-6">
        <BrandLockup subtitle="My workspace" />
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <SignOutButton />
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        {children}
      </main>
    </div>
  )
}
