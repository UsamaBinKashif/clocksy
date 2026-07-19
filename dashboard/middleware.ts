import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all real navigations except API route handlers (which do their own
     * auth), Next.js internals, and static assets/image files.
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
  ]
}
