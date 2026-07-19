import type { Profile, UserRole } from '@/types'
import { getMe } from '@/lib/auth'
import { getSessionToken } from '@/lib/session'

/**
 * Loads the caller's own profile. Used for role-based UI gating; team reports
 * still go through the Fastify API.
 */
export async function getProfile(): Promise<Profile | null> {
  const me = await getMe()
  if (!me) return null

  return {
    id: me.id,
    display_name: me.display_name,
    avatar_url: me.avatar_url,
    team_id: me.team_id,
    role: me.role
  }
}

/**
 * Returns the caller's role, or `null` if unauthenticated / no profile.
 */
export async function getRole(): Promise<UserRole | null> {
  const me = await getMe()
  return me?.role ?? null
}

/**
 * Session access token for authenticated Fastify API calls.
 */
export async function getAccessToken(): Promise<string | null> {
  return getSessionToken()
}
