import Link from 'next/link'
import {
  Activity,
  CalendarClock,
  ChevronLeft,
  Clock,
  ListChecks,
  Timer
} from 'lucide-react'
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

export default async function AdminEmployeeDetailPage({
  params
}: {
  params: { id: string }
}): Promise<JSX.Element> {
  const { id } = params

  let error: string | null = null
  let report: Awaited<ReturnType<typeof fetchEmployeeReport>> | null = null

  try {
    report = await fetchEmployeeReport(id)
  } catch (err) {
    error =
      err instanceof Error ? err.message : 'Could not load employee report'
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
      key: 'period',
      header: 'Period',
      headerIcon: CalendarClock,
      emphasize: false,
      render: (s) => (
        <span>
          {new Date(s.started_at).toLocaleString()}
          {s.ended_at
            ? ` → ${new Date(s.ended_at).toLocaleString()}`
            : ' → now'}
        </span>
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
      <div>
        <Link
          href="/admin/employees"
          className="inline-flex items-center gap-1 text-sm text-text-secondary transition-colors hover:text-text-link"
        >
          <ChevronLeft className="h-4 w-4" />
          Employees
        </Link>
        <div className="mt-2">
          <PageHeader
            title={report?.employee?.display_name ?? 'Employee'}
            subtitle="Sessions, activity, and screenshots."
          />
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-border bg-status-error-bg px-4 py-3 text-sm text-text-primary"
        >
          {error}
        </div>
      ) : null}

      {report ? (
        <>
          <StatStrip
            className="sm:grid-cols-3"
            items={[
              {
                label: 'Tracked hours',
                value: `${formatHours(totalSeconds)}h`,
                icon: Timer
              },
              {
                label: 'Sessions',
                value: String(report.sessions.length),
                icon: ListChecks
              },
              {
                label: 'Activity',
                value: `${activityPct}%`,
                icon: Activity
              }
            ]}
          />

          <section className="flex flex-col gap-3">
            <h2 className="text-md font-semibold tracking-tight">Sessions</h2>
            <DataTable
              columns={sessionColumns}
              data={report.sessions}
              rowKey={(s) => s.id}
              emptyTitle="No sessions yet"
              emptyDescription="Sessions appear here once tracking starts in the desktop app."
            />
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-md font-semibold tracking-tight">Screenshots</h2>
            {report.screenshots.length === 0 ? (
              <p className="text-sm text-text-secondary">No screenshots yet.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {report.screenshots.map((shot) => (
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
