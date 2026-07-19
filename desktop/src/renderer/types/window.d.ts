/**
 * Renderer-facing view of the preload bridge exposed on `window.clocksy`.
 */
type TrackerStatus = 'stopped' | 'active' | 'paused'

interface AuthUser {
  id: string
  email: string | null
}

interface ProjectOption {
  id: string
  name: string
  client_name: string | null
}

interface TrackerState {
  status: TrackerStatus
  sessionId: string | null
  startedAt: string | null
  elapsedSeconds: number
  todaySeconds: number
  activityHookAvailable: boolean
}

interface LoginPayload {
  email: string
  password: string
}

interface ClocksyRendererBridge {
  readonly platform: string
  getAppVersion: () => Promise<string>
  login: (payload: LoginPayload) => Promise<AuthUser>
  logout: () => Promise<void>
  getUser: () => Promise<AuthUser | null>
  getProjects: () => Promise<ProjectOption[]>
  startSession: (projectId?: string | null) => Promise<TrackerState>
  pauseSession: () => Promise<TrackerState>
  resumeSession: () => Promise<TrackerState>
  stopSession: () => Promise<TrackerState>
  getTrackerState: () => Promise<TrackerState>
  onSessionStatus: (listener: (state: TrackerState) => void) => () => void
}

declare global {
  interface Window {
    clocksy: ClocksyRendererBridge
  }
}

export {}
