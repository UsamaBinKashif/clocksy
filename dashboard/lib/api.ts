const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3001'

export interface ApiRequestOptions extends RequestInit {
  /** Backend JWT to send as `Authorization: Bearer <token>`. */
  token?: string
}

/**
 * Typed fetch wrapper for the Clocksy backend. All protected data is fetched
 * through here — the dashboard never queries the database directly.
 */
export async function apiFetch<T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { token, headers, ...rest } = options

  const response = await fetch(`${BACKEND_URL}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers
    }
  })

  if (!response.ok) {
    throw new Error(`Request to ${path} failed with status ${response.status}`)
  }

  return (await response.json()) as T
}
