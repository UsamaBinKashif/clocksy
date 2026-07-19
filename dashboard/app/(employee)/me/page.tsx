import { Activity, Clock, ListChecks, Timer } from 'lucide-react'
import { getUser } from '@/lib/auth'
import { getProfile } from '@/lib/profiles'
import { ScreenshotThumb } from '@/components/screenshot-thumb'
import {
  fetchEmployeeReport,
  formatHours,
  overallActivityPercent,
  sessionTrackedSeconds
} from '@/lib/reports'
import { PageHeader } from '@/components/ui/page-header'
import { StatStrip } from '@/components/ui/stat-strip'
import { DataTable, type DataTableColumn } from '@/components/ui/data-table'
import { StatusPill, type StatusTone } from '@/components/ui/status-pill'

type SessionRow = Awaited<
  ReturnType<typeof fetchEmployeeReport>
>['sessions'][number]

function sessionTone(status: string): StatusTone {
  if (status === 'active') return 'active'
  if (status === 'paused') return 'idle'
  return 'neutral'
}

export default async function EmployeeHomePage(): Promise<JSX.Element> {
  const [user, profile] = await Promise.all([getUser(), getProfile()])

  let error: string | null = null
  let report: Awaited<ReturnType<typeof fetchEmployeeReport>> | null = null

  if (user) {
    try {
      report = await fetchEmployeeReport(user.id)
    } catch (err) {
      error =
        err instanceof Error
          ? err.message
          : 'Could not load your report. Is the backend running?'
    }
  }

  const totalSeconds =
    report?.sessions.reduce((sum, s) => sum + sessionTrackedSeconds(s), 0) ?? 0
  const activityPct = report ? overallActivityPercent(report) : 0

  const sessionColumns: DataTableColumn<SessionRow>[] = [
    {
      key: 'status',
      header: 'Status',
      headerIcon: Activity,
      render: (s) => (
        <StatusPill tone={sessionTone(s.status)}>{s.status}</StatusPill>
      )
    },
    {
      key: 'tracked',
      header: 'Tracked',
      headerIcon: Clock,
      align: 'right',
      nowrap: true,
      render: (s) => (
        <span className="font-mono tabular-nums">
          {formatHours(sessionTrackedSeconds(s))}h
        </span>
      )
    }
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Hello${profile?.display_name ? `, ${profile.display_name}` : ''}`}
        subtitle={
          user?.email
            ? `Signed in as ${user.email} · use Clocksy Desktop to clock in.`
            : 'Use Clocksy Desktop to clock in.'
        }
      />

      {!profile ? (
        <div
          role="alert"
          className="rounded-lg border border-border bg-status-error-bg px-4 py-3 text-sm text-text-primary"
        >
          No profile found. Ensure your account has been seeded, then sign out
          and back in.
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-border bg-status-error-bg px-4 py-3 text-sm text-text-primary"
        >
          {error}
        </div>
      ) : null}

      <StatStrip
        className="sm:grid-cols-3"
        items={[
          {
            label: 'Tracked',
            value: `${formatHours(totalSeconds)}h`,
            icon: Timer
          },
          {
            label: 'Activity',
            value: `${activityPct}%`,
            icon: Activity
          },
          {
            label: 'Sessions',
            value: String(report?.sessions.length ?? 0),
            icon: ListChecks
          }
        ]}
      />

      {report ? (
        <>
          <section className="flex flex-col gap-3">
            <h2 className="text-md font-semibold tracking-tight">
              Recent sessions
            </h2>
            <DataTable
              columns={sessionColumns}
              data={report.sessions.slice(0, 10)}
              rowKey={(s) => s.id}
              emptyTitle="No sessions yet"
              emptyDescription="Start one in the desktop app to see it here."
            />
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-md font-semibold tracking-tight">Screenshots</h2>
            {report.screenshots.length === 0 ? (
              <p className="text-sm text-text-secondary">None yet.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {report.screenshots.slice(0, 8).map((shot) => (
                  <ScreenshotThumb
                    key={shot.id}
                    id={shot.id}
                    takenAt={shot.taken_at}
                    activityPercent={Number(shot.activity_percent)}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  )
}
