import { config } from './config'
import { authService } from './auth'

/**
 * Read-only lookups the tracker needs from the backend: the project list for the
 * picker and the team's capture settings (screenshots on/off + interval range).
 */

export interface ProjectOption {
  id: string
  name: string
  client_name: string | null
}

export interface CaptureSettings {
  screenshotsEnabled: boolean
  screenshotMinIntervalMs: number
  screenshotMaxIntervalMs: number
}

const FALLBACK_SETTINGS: CaptureSettings = {
  screenshotsEnabled: true,
  screenshotMinIntervalMs: config.screenshotIntervalMs,
  screenshotMaxIntervalMs: config.screenshotIntervalMs
}

export async function fetchProjects(): Promise<ProjectOption[]> {
  const token = authService.getAccessToken()
  if (!token) return []
  try {
    const res = await fetch(`${config.backendUrl}/projects`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) return []
    const data = (await res.json()) as {
      projects: { id: string; name: string; client_name: string | null }[]
    }
    return data.projects.map((p) => ({
      id: p.id,
      name: p.name,
      client_name: p.client_name
    }))
  } catch {
    return []
  }
}

export async function fetchCaptureSettings(): Promise<CaptureSettings> {
  const token = authService.getAccessToken()
  if (!token) return FALLBACK_SETTINGS

  try {
    const res = await fetch(`${config.backendUrl}/settings`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) return FALLBACK_SETTINGS

    const data = (await res.json()) as {
      screenshots_enabled: boolean
      screenshot_min_interval_sec: number
      screenshot_max_interval_sec: number
    }

    // A SCREENSHOT_INTERVAL_MS env override wins (used for local testing) and
    // fixes the interval to a single value.
    const rawEnv = process.env.SCREENSHOT_INTERVAL_MS
    const envMs = rawEnv ? Number(rawEnv) : NaN
    if (Number.isFinite(envMs) && envMs > 0) {
      return {
        screenshotsEnabled: data.screenshots_enabled,
        screenshotMinIntervalMs: envMs,
        screenshotMaxIntervalMs: envMs
      }
    }

    return {
      screenshotsEnabled: data.screenshots_enabled,
      screenshotMinIntervalMs: data.screenshot_min_interval_sec * 1000,
      screenshotMaxIntervalMs: data.screenshot_max_interval_sec * 1000
    }
  } catch {
    return FALLBACK_SETTINGS
  }
}
