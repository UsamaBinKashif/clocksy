/**
 * Central definition of every IPC channel and the typed bridge the preload
 * script exposes to the renderer. Channel names are defined once here so no
 * stringly-typed channel is used anywhere in the main or preload process.
 */

export const IpcChannel = {
  GetAppVersion: 'app:get-version',
  Login: 'auth:login',
  Logout: 'auth:logout',
  GetUser: 'auth:get-user',
  GetProjects: 'projects:list',
  StartSession: 'tracker:start',
  PauseSession: 'tracker:pause',
  ResumeSession: 'tracker:resume',
  StopSession: 'tracker:stop',
  GetTrackerState: 'tracker:get-state',
  SessionStatus: 'tracker:status'
} as const

export type IpcChannelName = (typeof IpcChannel)[keyof typeof IpcChannel]

export type TrackerStatus = 'stopped' | 'active' | 'paused'

export interface AuthUser {
  id: string
  email: string | null
}

export interface ProjectOption {
  id: string
  name: string
  client_name: string | null
}

export interface TrackerState {
  status: TrackerStatus
  sessionId: string | null
  startedAt: string | null
  elapsedSeconds: number
  todaySeconds: number
  activityHookAvailable: boolean
}

export interface LoginPayload {
  email: string
  password: string
}

export interface ClocksyBridge {
  readonly platform: NodeJS.Platform
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
