import { cookies } from 'next/headers'

/** Name of the httpOnly cookie that holds the backend-issued JWT. */
export const SESSION_COOKIE = 'clocksy_token'

/** Cookie lifetime — keep in sync with the backend JWT_EXPIRES_IN (7 days). */
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7

/** Reads the backend JWT from the request cookies (server-side only). */
export async function getSessionToken(): Promise<string | null> {
  const store = await cookies()
  return store.get(SESSION_COOKIE)?.value ?? null
}
