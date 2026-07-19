import { SignJWT, jwtVerify, type JWTPayload } from 'jose'

/**
 * HS256 JWT signing/verification for Clocksy's self-hosted auth. The same
 * secret is shared with the dashboard (server-side only) so it can verify
 * tokens for route gating.
 */

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET is required')
  }
  return new TextEncoder().encode(secret)
}

export interface TokenClaims extends JWTPayload {
  sub: string
  email: string
  role: string
  team_id: string | null
}

export async function signToken(claims: {
  sub: string
  email: string
  role: string
  team_id: string | null
}): Promise<string> {
  const expiresIn = process.env.JWT_EXPIRES_IN ?? '7d'

  return new SignJWT({
    email: claims.email,
    role: claims.role,
    team_id: claims.team_id
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getSecret())
}

export async function verifyToken(token: string): Promise<TokenClaims> {
  const { payload } = await jwtVerify(token, getSecret(), {
    algorithms: ['HS256']
  })

  if (!payload.sub) {
    throw new Error('Token missing subject')
  }

  return payload as TokenClaims
}
