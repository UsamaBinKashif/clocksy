import { NextResponse } from 'next/server'
import { getSessionToken } from '@/lib/session'

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3001'

/**
 * Server-side proxy so the browser never handles the httpOnly session token.
 * Forwards to the backend, which enforces owner/team-admin access and returns
 * a short-lived presigned URL.
 */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const token = await getSessionToken()
  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  let res: Response
  try {
    res = await fetch(`${BACKEND_URL}/screenshots/${params.id}/url`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store'
    })
  } catch {
    return NextResponse.json({ error: 'Backend unreachable' }, { status: 502 })
  }

  if (!res.ok) {
    return NextResponse.json(
      { error: 'Could not load screenshot' },
      { status: res.status }
    )
  }

  const data = (await res.json()) as { url: string; expires_in: number }
  return NextResponse.json(data)
}
