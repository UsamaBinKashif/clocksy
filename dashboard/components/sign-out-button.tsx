'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function SignOutButton(): JSX.Element {
  const router = useRouter()
  const [isSigningOut, setIsSigningOut] = useState(false)

  async function handleSignOut(): Promise<void> {
    setIsSigningOut(true)
    try {
      await fetch('/api/logout', { method: 'POST' })
      router.replace('/login')
      router.refresh()
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => void handleSignOut()}
      disabled={isSigningOut}
      className="px-2"
    >
      <LogOut className="h-4 w-4" />
      {isSigningOut ? 'Signing out…' : 'Sign out'}
    </Button>
  )
}
