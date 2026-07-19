import { apiFetch } from '@/lib/api'
import { getAccessToken } from '@/lib/profiles'
import type { ApiKey, Client, Project, Screenshot, TeamSettings } from '@/types'

/** Server-side reads for projects, clients, settings, and API keys. */

export async function fetchProjects(includeArchived = false): Promise<Project[]> {
  const token = await getAccessToken()
  if (!token) throw new Error('Not authenticated')
  const qs = includeArchived ? '?include_archived=true' : ''
  const data = await apiFetch<{ projects: Project[] }>(`/projects${qs}`, {
    token
  })
  return data.projects
}

export async function fetchClients(): Promise<Client[]> {
  const token = await getAccessToken()
  if (!token) throw new Error('Not authenticated')
  const data = await apiFetch<{ clients: Client[] }>('/clients', { token })
  return data.clients
}

export async function fetchSettings(): Promise<TeamSettings> {
  const token = await getAccessToken()
  if (!token) throw new Error('Not authenticated')
  return apiFetch<TeamSettings>('/settings', { token })
}

export async function fetchApiKeys(): Promise<ApiKey[]> {
  const token = await getAccessToken()
  if (!token) throw new Error('Not authenticated')
  const data = await apiFetch<{ keys: ApiKey[] }>('/api-keys', { token })
  return data.keys
}

export type TeamScreenshot = Screenshot & { user_name: string }

export async function fetchTeamScreenshots(params?: {
  from?: string
  to?: string
  limit?: number
}): Promise<TeamScreenshot[]> {
  const token = await getAccessToken()
  if (!token) throw new Error('Not authenticated')

  const query = new URLSearchParams()
  if (params?.from) query.set('from', params.from)
  if (params?.to) query.set('to', params.to)
  if (params?.limit) query.set('limit', String(params.limit))
  const qs = query.toString()

  const data = await apiFetch<{ screenshots: TeamScreenshot[] }>(
    `/reports/team/screenshots${qs ? `?${qs}` : ''}`,
    { token }
  )
  return data.screenshots
}
