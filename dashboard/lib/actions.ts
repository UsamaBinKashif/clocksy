'use server'

import { revalidatePath } from 'next/cache'
import { apiFetch } from '@/lib/api'
import { getSessionToken } from '@/lib/session'

/**
 * Server actions for every dashboard mutation. Each reads the httpOnly session
 * cookie server-side and calls the Fastify backend with the JWT; the browser
 * never handles the token. Authorization is enforced by the backend.
 */

async function tokenOrThrow(): Promise<string> {
  const token = await getSessionToken()
  if (!token) throw new Error('Not authenticated')
  return token
}

// ---- Projects ----

export async function createProjectAction(formData: FormData): Promise<void> {
  const token = await tokenOrThrow()
  const name = String(formData.get('name') ?? '').trim()
  const clientId = String(formData.get('client_id') ?? '')
  if (!name) throw new Error('Name is required')

  await apiFetch('/projects', {
    method: 'POST',
    token,
    body: JSON.stringify({
      name,
      ...(clientId ? { client_id: clientId } : {})
    })
  })
  revalidatePath('/admin/projects')
}

export async function setProjectArchivedAction(
  id: string,
  archived: boolean
): Promise<void> {
  const token = await tokenOrThrow()
  await apiFetch(`/projects/${id}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify({ archived })
  })
  revalidatePath('/admin/projects')
}

export async function deleteProjectAction(id: string): Promise<void> {
  const token = await tokenOrThrow()
  await apiFetch(`/projects/${id}`, { method: 'DELETE', token })
  revalidatePath('/admin/projects')
}

// ---- Clients ----

export async function createClientAction(formData: FormData): Promise<void> {
  const token = await tokenOrThrow()
  const name = String(formData.get('name') ?? '').trim()
  if (!name) throw new Error('Name is required')

  await apiFetch('/clients', {
    method: 'POST',
    token,
    body: JSON.stringify({ name })
  })
  revalidatePath('/admin/projects')
}

export async function deleteClientAction(id: string): Promise<void> {
  const token = await tokenOrThrow()
  await apiFetch(`/clients/${id}`, { method: 'DELETE', token })
  revalidatePath('/admin/projects')
}

// ---- Settings ----

export async function updateSettingsAction(formData: FormData): Promise<void> {
  const token = await tokenOrThrow()
  const screenshotsEnabled = formData.get('screenshots_enabled') === 'on'
  const minSec = Number(formData.get('screenshot_min_interval_sec'))
  const maxSec = Number(formData.get('screenshot_max_interval_sec'))

  await apiFetch('/settings', {
    method: 'PUT',
    token,
    body: JSON.stringify({
      screenshots_enabled: screenshotsEnabled,
      ...(Number.isFinite(minSec)
        ? { screenshot_min_interval_sec: minSec }
        : {}),
      ...(Number.isFinite(maxSec)
        ? { screenshot_max_interval_sec: maxSec }
        : {})
    })
  })
  revalidatePath('/admin/settings')
}

// ---- API keys ----

export async function createApiKeyAction(
  name: string
): Promise<{ token: string; prefix: string }> {
  const token = await tokenOrThrow()
  const created = await apiFetch<{ token: string; prefix: string }>(
    '/api-keys',
    {
      method: 'POST',
      token,
      body: JSON.stringify({ name })
    }
  )
  revalidatePath('/admin/api-keys')
  return { token: created.token, prefix: created.prefix }
}

export async function revokeApiKeyAction(id: string): Promise<void> {
  const token = await tokenOrThrow()
  await apiFetch(`/api-keys/${id}`, { method: 'DELETE', token })
  revalidatePath('/admin/api-keys')
}

// ---- Employee self-service (ethical monitoring) ----

export async function deleteMyScreenshotAction(id: string): Promise<void> {
  const token = await tokenOrThrow()
  await apiFetch(`/screenshots/${id}`, { method: 'DELETE', token })
  revalidatePath('/me')
}

export async function deleteMySessionAction(id: string): Promise<void> {
  const token = await tokenOrThrow()
  await apiFetch(`/sessions/${id}`, { method: 'DELETE', token })
  revalidatePath('/me')
}

export async function deleteAllMyDataAction(): Promise<void> {
  const token = await tokenOrThrow()
  await apiFetch('/me/data', { method: 'DELETE', token })
  revalidatePath('/me')
}
