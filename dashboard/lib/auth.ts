import { cache } from 'react'
import type { UserRole } from '@/types'
import { getSessionToken } from '@/lib/session'

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3001'

export interface Me {
  id: string
  email: string | null
  display_name: string
  avatar_url: string | null
  team_id: string | null
  role: UserRole
}

/**
 * Fetches the caller's identity + profile from the backend `/auth/me` using the
 * session cookie. Cached per-request so multiple callers (layout, page,
 * profile helpers) share a single round-trip. Identity always comes from the
 * server-verified JWT, never the client.
 */
export const getMe = cache(async (): Promise<Me | null> => {
  const token = await getSessionToken()
  if (!token) return null

  try {
    const res = await fetch(`${BACKEND_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store'
    })
    if (!res.ok) return null
    return (await res.json()) as Me
  } catch {
    return null
  }
})

/**
 * Returns the currently authenticated user, or `null` if there is no valid
 * session.
 */
export async function getUser(): Promise<{
  id: string
  email: string | null
} | null> {
  const me = await getMe()
  return me ? { id: me.id, email: me.email } : null
}
