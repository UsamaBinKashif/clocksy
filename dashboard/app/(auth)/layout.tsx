import type { ReactNode } from 'react'

export default function AuthLayout({
  children
}: {
  children: ReactNode
}): JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      {children}
    </div>
  )
}
