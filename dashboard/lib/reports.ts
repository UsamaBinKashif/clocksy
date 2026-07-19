import { apiFetch } from '@/lib/api'
import { getAccessToken } from '@/lib/profiles'
import type {
  ActivityLog,
  Profile,
  Project,
  Screenshot,
  Session
} from '@/types'

export interface TeamReport {
  team_id: string
  members: Pick<Profile, 'id' | 'display_name' | 'avatar_url' | 'role' | 'team_id'>[]
  sessions: Session[]
  projects: Project[]
}

export interface EmployeeReport {
  employee: Profile | null
  sessions: Session[]
  activity_logs: ActivityLog[]
  screenshots: Pick<
    Screenshot,
    'id' | 'session_id' | 'user_id' | 'taken_at' | 'storage_path' | 'activity_percent'
  >[]
}

export async function fetchTeamReport(params?: {
  from?: string
  to?: string
}): Promise<TeamReport> {
  const token = await getAccessToken()
  if (!token) throw new Error('Not authenticated')

  const query = new URLSearchParams()
  if (params?.from) query.set('from', params.from)
  if (params?.to) query.set('to', params.to)
  const qs = query.toString()

  return apiFetch<TeamReport>(`/reports/team${qs ? `?${qs}` : ''}`, { token })
}

export async function fetchEmployeeReport(
  employeeId: string,
  params?: { from?: string; to?: string }
): Promise<EmployeeReport> {
  const token = await getAccessToken()
  if (!token) throw new Error('Not authenticated')

  const query = new URLSearchParams()
  if (params?.from) query.set('from', params.from)
  if (params?.to) query.set('to', params.to)
  const qs = query.toString()

  return apiFetch<EmployeeReport>(
    `/reports/employee/${employeeId}${qs ? `?${qs}` : ''}`,
    { token }
  )
}

export async function fetchScreenshotUrl(id: string): Promise<string> {
  const token = await getAccessToken()
  if (!token) throw new Error('Not authenticated')

  const data = await apiFetch<{ url: string }>(`/screenshots/${id}/url`, {
    token
  })
  return data.url
}

/** Billed seconds for a session: wall clock minus paused_seconds. */
export function sessionTrackedSeconds(session: Session, now = Date.now()): number {
  const start = new Date(session.started_at).getTime()
  const end = session.ended_at ? new Date(session.ended_at).getTime() : now
  const raw = (end - start) / 1000 - (session.paused_seconds ?? 0)
  return Math.max(0, Math.floor(raw))
}

export function formatHours(seconds: number): string {
  const hours = seconds / 3600
  if (hours < 10) return hours.toFixed(1)
  return String(Math.round(hours))
}

export function startOfTodayIso(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export function activityPercentFromLogs(logs: ActivityLog[]): number {
  if (logs.length === 0) return 0
  const active = logs.filter(
    (log) => !log.is_idle && log.keyboard_count + log.mouse_count > 0
  ).length
  return Math.round((active / logs.length) * 100)
}

/**
 * Average of the per-screenshot activity levels. Each screenshot's
 * `activity_percent` is already active-intervals / total-intervals for its span
 * (scrin.io method, computed on the desktop), so the period's activity level is
 * the mean across screenshots.
 */
export function averageActivityPercent(
  screenshots: { activity_percent: number }[]
): number {
  if (screenshots.length === 0) return 0
  const sum = screenshots.reduce(
    (acc, shot) => acc + Number(shot.activity_percent),
    0
  )
  return Math.round(sum / screenshots.length)
}

/**
 * Period activity level. Prefers the per-screenshot metric; falls back to the
 * minute-bucket logs when no screenshots exist (e.g. screenshots disabled).
 */
export function overallActivityPercent(report: {
  activity_logs: ActivityLog[]
  screenshots: { activity_percent: number }[]
}): number {
  if (report.screenshots.length > 0) {
    return averageActivityPercent(report.screenshots)
  }
  return activityPercentFromLogs(report.activity_logs)
}
