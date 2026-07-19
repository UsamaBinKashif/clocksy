import Link from 'next/link'
import { Clock, FolderKanban, Users } from 'lucide-react'
import { ExportCsvButton } from '@/components/export-csv-button'
import { HoursBarChart } from '@/components/hours-bar-chart'
import {
  fetchTeamReport,
  formatHours,
  sessionTrackedSeconds
} from '@/lib/reports'
import { PageHeader } from '@/components/ui/page-header'
import { StatStrip } from '@/components/ui/stat-strip'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { DataTable, type DataTableColumn } from '@/components/ui/data-table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

function resolveRange(searchParams: {
  from?: string
  to?: string
}): { from: string; to: string; fromInput: string; toInput: string } {
  const now = new Date()
  const defaultTo = now
  const defaultFrom = new Date(now)
  defaultFrom.setDate(defaultFrom.getDate() - 7)
  defaultFrom.setHours(0, 0, 0, 0)

  const from = searchParams.from ? new Date(searchParams.from) : defaultFrom
  const to = searchParams.to ? new Date(`${searchParams.to}T23:59:59`) : defaultTo

  const toInputValue = (d: Date): string => d.toISOString().slice(0, 10)

  return {
    from: from.toISOString(),
    to: to.toISOString(),
    fromInput: toInputValue(from),
    toInput: toInputValue(to)
  }
}

interface EmployeeRow {
  id: string
  name: string
  hours: number
}

export default async function AdminReportsPage({
  searchParams
}: {
  searchParams: { from?: string; to?: string }
}): Promise<JSX.Element> {
  const range = resolveRange(searchParams)

  let error: string | null = null
  let report: Awaited<ReturnType<typeof fetchTeamReport>> | null = null

  try {
    report = await fetchTeamReport({ from: range.from, to: range.to })
  } catch (err) {
    error = err instanceof Error ? err.message : 'Could not load report.'
  }

  const nameById = new Map(
    report?.members.map((m) => [m.id, m.display_name || 'Unnamed']) ?? []
  )

  const secondsByEmployee = new Map<string, number>()
  const secondsByProject = new Map<string, number>()
  let totalSeconds = 0

  for (const s of report?.sessions ?? []) {
    const secs = sessionTrackedSeconds(s)
    totalSeconds += secs
    secondsByEmployee.set(
      s.user_id,
      (secondsByEmployee.get(s.user_id) ?? 0) + secs
    )
    const key = s.project_name ?? 'No project'
    secondsByProject.set(key, (secondsByProject.get(key) ?? 0) + secs)
  }

  const employeeRows: EmployeeRow[] = [...secondsByEmployee.entries()]
    .map(([id, secs]) => ({
      id,
      name: nameById.get(id) ?? 'Unknown',
      hours: Number((secs / 3600).toFixed(2))
    }))
    .sort((a, b) => b.hours - a.hours)

  const projectRows = [...secondsByProject.entries()]
    .map(([label, secs]) => ({
      label,
      hours: Number((secs / 3600).toFixed(2))
    }))
    .sort((a, b) => b.hours - a.hours)

  const employeeColumns: DataTableColumn<EmployeeRow>[] = [
    { key: 'name', header: 'Employee', headerIcon: Users, emphasize: true, render: (r) => r.name },
    {
      key: 'hours',
      header: 'Hours',
      headerIcon: Clock,
      align: 'right',
      nowrap: true,
      render: (r) => <span className="font-mono tabular-nums">{r.hours}h</span>
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (r) => (
        <Link
          href={`/admin/employees/${r.id}`}
          className="text-sm text-text-link hover:underline"
        >
          Details →
        </Link>
      )
    }
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reports"
        subtitle="Tracked hours by employee and project."
        actions={
          <ExportCsvButton
            filename={`clocksy-report-${range.fromInput}_${range.toInput}.csv`}
            headers={['Employee', 'Hours']}
            rows={employeeRows.map((r) => [r.name, r.hours])}
          />
        }
      />

      <form className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface-elevated p-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="from">From</Label>
          <Input
            id="from"
            type="date"
            name="from"
            defaultValue={range.fromInput}
            className="w-auto"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="to">To</Label>
          <Input
            id="to"
            type="date"
            name="to"
            defaultValue={range.toInput}
            className="w-auto"
          />
        </div>
        <Button type="submit">Apply</Button>
      </form>

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
          { label: 'Total hours', value: `${formatHours(totalSeconds)}h`, icon: Clock },
          {
            label: 'Employees tracked',
            value: String(employeeRows.length),
            icon: Users
          },
          {
            label: 'Projects',
            value: String(report?.projects.length ?? 0),
            icon: FolderKanban
          }
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>Hours by employee</CardTitle>
        </CardHeader>
        <CardContent>
          <HoursBarChart
            data={employeeRows.map((r) => ({ label: r.name, hours: r.hours }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Hours by project</CardTitle>
          <ExportCsvButton
            filename={`clocksy-projects-${range.fromInput}_${range.toInput}.csv`}
            headers={['Project', 'Hours']}
            rows={projectRows.map((r) => [r.label, r.hours])}
            label="Export CSV"
          />
        </CardHeader>
        <CardContent>
          <HoursBarChart data={projectRows} />
        </CardContent>
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="text-md font-semibold tracking-tight">
          Employee breakdown
        </h2>
        <DataTable
          columns={employeeColumns}
          data={employeeRows}
          rowKey={(r) => r.id}
          emptyTitle="No tracked time in this range"
          emptyDescription="Adjust the date range above to see results."
        />
      </section>
    </div>
  )
}
