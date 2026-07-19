import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { StatusPill, type StatusTone } from '@/components/ui/status-pill'
import { Label } from '@/components/ui/label'
import { ThemeToggle } from '@/components/ui/theme-toggle'

type TrackerStatus = 'stopped' | 'active' | 'paused'

interface TrackerState {
  status: TrackerStatus
  sessionId: string | null
  startedAt: string | null
  elapsedSeconds: number
  todaySeconds: number
  activityHookAvailable: boolean
}

interface ProjectOption {
  id: string
  name: string
  client_name: string | null
}

interface TrackerPageProps {
  email: string | null
  onLogout: () => void
}

function formatHms(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return [hours, minutes, seconds]
    .map((n) => String(n).padStart(2, '0'))
    .join(':')
}

function statusLabel(status: TrackerStatus): string {
  if (status === 'active') return 'Active'
  if (status === 'paused') return 'Paused'
  return 'Stopped'
}

function statusTone(status: TrackerStatus): StatusTone {
  if (status === 'active') return 'active'
  if (status === 'paused') return 'idle'
  return 'offline'
}

export function TrackerPage({ email, onLogout }: TrackerPageProps): JSX.Element {
  const [state, setState] = useState<TrackerState>({
    status: 'stopped',
    sessionId: null,
    startedAt: null,
    elapsedSeconds: 0,
    todaySeconds: 0,
    activityHookAvailable: false
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [projectId, setProjectId] = useState<string>('')

  useEffect(() => {
    void window.clocksy.getTrackerState().then(setState)
    return window.clocksy.onSessionStatus(setState)
  }, [])

  useEffect(() => {
    void window.clocksy.getProjects().then(setProjects)
  }, [])

  async function run(action: () => Promise<TrackerState>): Promise<void> {
    setBusy(true)
    setError(null)
    try {
      const next = await action()
      setState(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-screen flex-col bg-background px-5 py-4 text-text-primary">
      <header className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold tracking-tight">Clocksy</p>
          <p className="truncate text-xs text-text-secondary">
            {email ?? 'Signed in'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={() => void onLogout()}>
            Sign out
          </Button>
        </div>
      </header>

      <div className="mt-6 flex flex-col items-center gap-3 rounded-lg border border-border bg-surface-elevated px-6 py-8">
        <StatusPill tone={statusTone(state.status)}>
          {statusLabel(state.status)}
        </StatusPill>

        <p className="font-mono text-4xl font-semibold tracking-tight tabular-nums">
          {formatHms(state.elapsedSeconds)}
        </p>

        <p className="text-sm text-text-secondary">
          Today ·{' '}
          <span className="font-mono tabular-nums">
            {formatHms(state.todaySeconds)}
          </span>
        </p>
      </div>

      {state.status === 'stopped' && projects.length > 0 ? (
        <div className="mt-5 flex flex-col gap-1.5">
          <Label htmlFor="project">Project</Label>
          <select
            id="project"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="h-9 w-full rounded-md border border-border bg-surface-elevated px-3 text-sm text-text-primary shadow-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
          >
            <option value="">No project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.client_name ? `${p.client_name} — ${p.name}` : p.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-2">
        {state.status === 'stopped' ? (
          <Button
            disabled={busy}
            variant="start"
            onClick={() =>
              void run(() => window.clocksy.startSession(projectId || null))
            }
            className="w-full"
          >
            Start
          </Button>
        ) : null}

        {state.status === 'active' ? (
          <Button
            disabled={busy}
            variant="outline"
            onClick={() => void run(() => window.clocksy.pauseSession())}
            className="w-full"
          >
            Pause
          </Button>
        ) : null}

        {state.status === 'paused' ? (
          <Button
            disabled={busy}
            variant="start"
            onClick={() => void run(() => window.clocksy.resumeSession())}
            className="w-full"
          >
            Resume
          </Button>
        ) : null}

        {state.status !== 'stopped' ? (
          <Button
            disabled={busy}
            variant="secondary"
            onClick={() => void run(() => window.clocksy.stopSession())}
            className="w-full"
          >
            Stop
          </Button>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="mt-4 text-center text-sm text-status-error">
          {error}
        </p>
      ) : null}

      <p className="mt-auto pt-6 text-center text-xs text-text-muted">
        {state.activityHookAvailable
          ? 'Tracking input counts · screenshots at random intervals'
          : 'Input hook unavailable — idle pause and screenshots still run. Install X11 build deps to enable keyboard/mouse counts.'}
      </p>
    </div>
  )
}
