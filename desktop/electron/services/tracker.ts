import { BrowserWindow } from 'electron'
import { config } from './config'
import { authService } from './auth'
import { activityService } from './activity'
import { idleService } from './idle'
import { screenshotService } from './screenshot'
import { uploadService } from './upload'
import { queueService } from './queue'
import { fetchCaptureSettings, type CaptureSettings } from './catalog'
import { IpcChannel, type TrackerState, type TrackerStatus } from '../types/ipc'

let status: TrackerStatus = 'stopped'
let sessionId: string | null = null
let startedAt: Date | null = null
let pausedSeconds = 0
let pauseStartedAt: Date | null = null
let tickTimer: NodeJS.Timeout | null = null

function elapsedSecondsNow(): number {
  if (!startedAt) return 0
  const end = pauseStartedAt ?? new Date()
  const raw = (end.getTime() - startedAt.getTime()) / 1000 - pausedSeconds
  return Math.max(0, Math.floor(raw))
}

function buildState(): TrackerState {
  return {
    status,
    sessionId,
    startedAt: startedAt?.toISOString() ?? null,
    elapsedSeconds: elapsedSecondsNow(),
    todaySeconds: queueService.getTodaySeconds() + (status === 'stopped' ? 0 : elapsedSecondsNow()),
    activityHookAvailable: activityService.isHookAvailable()
  }
}

function broadcast(): void {
  const state = buildState()
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(IpcChannel.SessionStatus, state)
  }
}

async function createRemoteSession(projectId?: string | null): Promise<string> {
  const token = authService.getAccessToken()
  if (!token) {
    throw new Error('Not authenticated')
  }

  let res: Response
  try {
    res = await fetch(`${config.backendUrl}/sessions/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        client_at: new Date().toISOString(),
        ...(projectId ? { project_id: projectId } : {})
      })
    })
  } catch {
    throw new Error(
      `Cannot reach backend at ${config.backendUrl}. Start the API and try again.`
    )
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(
      `Session start failed (${res.status})${detail ? `: ${detail}` : ''}`
    )
  }

  const body = (await res.json()) as { session_id?: string; id?: string }
  const id = body.session_id ?? body.id
  if (!id) {
    throw new Error('Backend did not return a session_id')
  }
  return id
}

async function notifyRemote(
  path: string,
  body: Record<string, unknown>
): Promise<void> {
  const token = authService.getAccessToken()
  if (!token || !sessionId) return

  try {
    await fetch(`${config.backendUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ session_id: sessionId, ...body })
    })
  } catch {
    // Offline — local state remains authoritative until upload/retry paths land.
  }
}

function startBackground(
  nextSessionId: string,
  captureSettings: CaptureSettings
): void {
  activityService.start(nextSessionId)
  idleService.removeAllListeners()
  idleService.on('idle', () => {
    activityService.setIdle(true)
    if (status === 'active') {
      void trackerService.pause({ fromIdle: true })
    }
  })
  idleService.on('active', () => {
    activityService.setIdle(false)
    if (status === 'paused') {
      void trackerService.resume({ fromIdle: true })
    }
  })
  idleService.start()
  screenshotService.start(nextSessionId, captureSettings)
  uploadService.start()

  if (tickTimer) clearInterval(tickTimer)
  tickTimer = setInterval(() => broadcast(), 1000)
}

function stopBackground(): void {
  if (tickTimer) {
    clearInterval(tickTimer)
    tickTimer = null
  }
  idleService.removeAllListeners()
  idleService.stop()
  activityService.stop()
  uploadService.stop()
  void screenshotService.stop()
}

export const trackerService = {
  getState(): TrackerState {
    return buildState()
  },

  async start(projectId?: string | null): Promise<TrackerState> {
    if (!authService.getUser()) {
      throw new Error('Not authenticated')
    }
    if (status === 'active') return buildState()
    if (status === 'paused') return this.resume()

    sessionId = await createRemoteSession(projectId)
    const captureSettings = await fetchCaptureSettings()
    startedAt = new Date()
    pausedSeconds = 0
    pauseStartedAt = null
    status = 'active'
    startBackground(sessionId, captureSettings)
    broadcast()
    return buildState()
  },

  async pause(_opts?: { fromIdle?: boolean }): Promise<TrackerState> {
    if (status !== 'active' || !sessionId) return buildState()

    pauseStartedAt = new Date()
    status = 'paused'
    activityService.setIdle(true)

    await notifyRemote('/sessions/pause', {
      client_at: new Date().toISOString(),
      paused_seconds: Math.floor(pausedSeconds)
    })

    broadcast()
    return buildState()
  },

  async resume(_opts?: { fromIdle?: boolean }): Promise<TrackerState> {
    if (status !== 'paused' || !sessionId) return buildState()

    if (pauseStartedAt) {
      pausedSeconds += (Date.now() - pauseStartedAt.getTime()) / 1000
      pauseStartedAt = null
    }

    status = 'active'
    activityService.setIdle(false)

    await notifyRemote('/sessions/start', {
      client_at: new Date().toISOString(),
      resume: true
    })

    broadcast()
    return buildState()
  },

  async stop(): Promise<TrackerState> {
    if (status === 'stopped') return buildState()

    if (status === 'paused' && pauseStartedAt) {
      pausedSeconds += (Date.now() - pauseStartedAt.getTime()) / 1000
      pauseStartedAt = null
    }

    const elapsed = elapsedSecondsNow()
    queueService.addTodaySeconds(elapsed)

    await notifyRemote('/sessions/stop', {
      client_at: new Date().toISOString(),
      paused_seconds: Math.floor(pausedSeconds)
    })

    stopBackground()
    status = 'stopped'
    sessionId = null
    startedAt = null
    pausedSeconds = 0
    broadcast()
    return buildState()
  },

  async forceStopOnLogout(): Promise<void> {
    if (status !== 'stopped') {
      await this.stop()
    }
  }
}
