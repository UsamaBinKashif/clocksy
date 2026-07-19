import { jwtVerify } from 'jose'
import type { UserRole } from '@/types'

export interface TokenClaims {
  sub: string
  email?: string
  role?: UserRole
  team_id?: string | null
}

/**
 * Verifies a backend-issued HS256 JWT using the shared JWT_SECRET. Runs on the
 * edge (middleware) as well as in server components. Returns `null` if the
 * token is missing, expired, or invalid.
 */
export async function verifyToken(
  token: string | undefined | null
): Promise<TokenClaims | null> {
  if (!token) return null

  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET is required to verify session tokens')
  }

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
      { algorithms: ['HS256'] }
    )
    if (!payload.sub) return null
    return payload as TokenClaims
  } catch {
    return null
  }
}
