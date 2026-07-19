import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE } from '@/lib/session'
import { verifyToken } from '@/lib/jwt'

const PUBLIC_PATHS = ['/login']

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  )
}

function isAdminPath(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/')
}

/**
 * Enforces auth + role redirects from the session cookie:
 * - unauthenticated -> `/login`
 * - authenticated on `/login` or `/` -> `/admin` (admins) or `/me` (employees)
 * - `/admin/*` requires `role = 'admin'`
 */
export async function updateSession(
  request: NextRequest
): Promise<NextResponse> {
  const { pathname } = request.nextUrl
  const onPublicPath = isPublicPath(pathname)

  const token = request.cookies.get(SESSION_COOKIE)?.value
  const claims = await verifyToken(token)

  if (!claims) {
    if (onPublicPath) {
      return NextResponse.next()
    }
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    const response = NextResponse.redirect(url)
    // Clear any stale/invalid cookie so we don't loop.
    if (token) response.cookies.delete(SESSION_COOKIE)
    return response
  }

  const home = claims.role === 'admin' ? '/admin' : '/me'

  if (onPublicPath || pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = home
    return NextResponse.redirect(url)
  }

  if (isAdminPath(pathname) && claims.role !== 'admin') {
    const url = request.nextUrl.clone()
    url.pathname = '/me'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}
