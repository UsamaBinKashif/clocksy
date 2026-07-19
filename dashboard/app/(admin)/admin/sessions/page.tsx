import { Activity, CalendarClock, Clock, FolderKanban, User } from 'lucide-react'
import { ExportCsvButton } from '@/components/export-csv-button'
import {
  fetchTeamReport,
  formatHours,
  sessionTrackedSeconds
} from '@/lib/reports'
import { PageHeader } from '@/components/ui/page-header'
import { DataTable, type DataTableColumn } from '@/components/ui/data-table'
import { StatusPill, type StatusTone } from '@/components/ui/status-pill'

interface SessionRow {
  id: string
  employee: string
  project: string
  started: string
  seconds: number
  status: string
}

function sessionTone(status: string): StatusTone {
  if (status === 'active') return 'active'
  if (status === 'paused') return 'idle'
  return 'neutral'
}

export default async function AdminSessionsPage(): Promise<JSX.Element> {
  let error: string | null = null
  let report: Awaited<ReturnType<typeof fetchTeamReport>> | null = null

  try {
    report = await fetchTeamReport()
  } catch (err) {
    error = err instanceof Error ? err.message : 'Could not load sessions.'
  }

  const nameById = new Map(
    report?.members.map((m) => [m.id, m.display_name || 'Unnamed']) ?? []
  )

  const rows: SessionRow[] = (report?.sessions ?? []).map((s) => ({
    id: s.id,
    employee: nameById.get(s.user_id) ?? 'Unknown',
    project: s.project_name ?? '—',
    started: new Date(s.started_at).toLocaleString(),
    seconds: sessionTrackedSeconds(s),
    status: s.status
  }))

  const columns: DataTableColumn<SessionRow>[] = [
    { key: 'employee', header: 'Employee', headerIcon: User, emphasize: true, render: (r) => r.employee },
    {
      key: 'project',
      header: 'Project',
      headerIcon: FolderKanban,
      render: (r) => r.project
    },
    {
      key: 'started',
      header: 'Started',
      headerIcon: CalendarClock,
      nowrap: true,
      render: (r) => r.started
    },
    {
      key: 'duration',
      header: 'Duration',
      headerIcon: Clock,
      align: 'right',
      nowrap: true,
      render: (r) => (
        <span className="font-mono tabular-nums">{formatHours(r.seconds)}h</span>
      )
    },
    {
      key: 'status',
      header: 'Status',
      headerIcon: Activity,
      render: (r) => <StatusPill tone={sessionTone(r.status)}>{r.status}</StatusPill>
    }
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Sessions"
        subtitle="Every tracked session across the team."
        actions={
          <ExportCsvButton
            filename="clocksy-sessions.csv"
            headers={['Employee', 'Project', 'Started', 'Hours', 'Status']}
            rows={rows.map((r) => [
              r.employee,
              r.project,
              r.started,
              formatHours(r.seconds),
              r.status
            ])}
          />
        }
      />

      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-border bg-status-error-bg px-4 py-3 text-sm text-text-primary"
        >
          {error}
        </div>
      ) : null}

      <DataTable
        columns={columns}
        data={rows}
        rowKey={(r) => r.id}
        emptyTitle="No sessions yet"
        emptyDescription="Tracked sessions from the desktop app will appear here."
      />
    </div>
  )
}
