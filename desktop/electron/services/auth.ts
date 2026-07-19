import { config } from './config'
import type { AuthUser } from '../types/ipc'

interface LoginResponse {
  token: string
  user: {
    id: string
    email: string | null
  }
}

let currentToken: string | null = null
let currentUser: AuthUser | null = null

export const authService = {
  async login(email: string, password: string): Promise<AuthUser> {
    const res = await fetch(`${config.backendUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), password })
    })

    if (!res.ok) {
      let message = 'Login failed'
      try {
        const body = (await res.json()) as { error?: string }
        if (body.error) message = body.error
      } catch {
        // keep default message
      }
      throw new Error(message)
    }

    const data = (await res.json()) as LoginResponse
    currentToken = data.token
    currentUser = { id: data.user.id, email: data.user.email }
    return currentUser
  },

  async logout(): Promise<void> {
    currentToken = null
    currentUser = null
  },

  getUser(): AuthUser | null {
    return currentUser
  },

  getAccessToken(): string | null {
    return currentToken
  }
}
