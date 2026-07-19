import Link from 'next/link'
import { Activity, Briefcase, Clock, User, Users } from 'lucide-react'
import {
  fetchTeamReport,
  formatHours,
  sessionTrackedSeconds,
  startOfTodayIso
} from '@/lib/reports'
import { PageHeader } from '@/components/ui/page-header'
import {
  DataTable,
  type DataTableColumn
} from '@/components/ui/data-table'
import { StatusPill, type StatusTone } from '@/components/ui/status-pill'

interface EmployeeRow {
  id: string
  name: string
  role: string
  hoursToday: number
  status: 'active' | 'paused' | 'offline'
}

const STATUS_TONE: Record<EmployeeRow['status'], StatusTone> = {
  active: 'active',
  paused: 'idle',
  offline: 'offline'
}

export default async function AdminEmployeesPage(): Promise<JSX.Element> {
  let error: string | null = null
  let rows: EmployeeRow[] = []

  try {
    const report = await fetchTeamReport({ from: startOfTodayIso() })

    rows = report.members.map((member) => {
      const memberSessions = report.sessions.filter(
        (s) => s.user_id === member.id
      )
      const hoursToday = memberSessions.reduce(
        (sum, s) => sum + sessionTrackedSeconds(s),
        0
      )
      const latest = memberSessions[0]
      let status: EmployeeRow['status'] = 'offline'
      if (latest?.status === 'active') status = 'active'
      else if (latest?.status === 'paused') status = 'paused'

      return {
        id: member.id,
        name: member.display_name || 'Unnamed',
        role: member.role,
        hoursToday,
        status
      }
    })
  } catch (err) {
    error =
      err instanceof Error
        ? err.message
        : 'Could not load employees. Is the backend running?'
  }

  const columns: DataTableColumn<EmployeeRow>[] = [
    {
      key: 'name',
      header: 'Name',
      headerIcon: User,
      emphasize: true,
      render: (row) => (
        <Link
          href={`/admin/employees/${row.id}`}
          className="text-text-primary hover:text-text-link"
        >
          {row.name}
        </Link>
      )
    },
    {
      key: 'role',
      header: 'Role',
      headerIcon: Briefcase,
      render: (row) => <span className="capitalize">{row.role}</span>
    },
    {
      key: 'hours',
      header: 'Hours today',
      headerIcon: Clock,
      align: 'right',
      nowrap: true,
      render: (row) => (
        <span className="font-mono tabular-nums">
          {formatHours(row.hoursToday)}h
        </span>
      )
    },
    {
      key: 'status',
      header: 'Status',
      headerIcon: Activity,
      render: (row) => (
        <StatusPill tone={STATUS_TONE[row.status]}>{row.status}</StatusPill>
      )
    }
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Employees"
        subtitle="Team members and today's tracked time."
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
        rowKey={(row) => row.id}
        onboardingEmpty={{
          icon: Users,
          title: 'No team members yet',
          description: 'Assign profiles to a team, then refresh to see them here.'
        }}
      />
    </div>
  )
}
