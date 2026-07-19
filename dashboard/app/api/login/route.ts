import { NextResponse } from 'next/server'
import { SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/session'

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3001'

export async function POST(request: Request): Promise<NextResponse> {
  let body: { email?: string; password?: string }
  try {
    body = (await request.json()) as { email?: string; password?: string }
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  if (!body.email || !body.password) {
    return NextResponse.json(
      { error: 'Email and password are required' },
      { status: 400 }
    )
  }

  let backendRes: Response
  try {
    backendRes = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: body.email, password: body.password })
    })
  } catch {
    return NextResponse.json(
      { error: 'Could not reach the authentication service' },
      { status: 502 }
    )
  }

  if (!backendRes.ok) {
    return NextResponse.json(
      { error: 'Invalid email or password' },
      { status: 401 }
    )
  }

  const data = (await backendRes.json()) as { token: string }
  const response = NextResponse.json({ ok: true })
  response.cookies.set(SESSION_COOKIE, data.token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE
  })
  return response
}
