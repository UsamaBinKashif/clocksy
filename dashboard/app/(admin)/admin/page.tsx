import Link from 'next/link'
import { Activity, CalendarClock, Clock, Users } from 'lucide-react'
import { getUser } from '@/lib/auth'
import { getProfile } from '@/lib/profiles'
import {
  fetchTeamReport,
  formatHours,
  sessionTrackedSeconds,
  startOfTodayIso
} from '@/lib/reports'
import { PageHeader } from '@/components/ui/page-header'
import { StatStrip } from '@/components/ui/stat-strip'
import { Card } from '@/components/ui/card'

export default async function AdminOverviewPage(): Promise<JSX.Element> {
  const [user, profile] = await Promise.all([getUser(), getProfile()])

  let reportError: string | null = null
  let hoursToday = 0
  let activeMembers = 0
  let membersTotal = 0
  let sessionsToday = 0

  try {
    const report = await fetchTeamReport({ from: startOfTodayIso() })
    membersTotal = report.members.length
    sessionsToday = report.sessions.length

    const secondsByUser = new Map<string, number>()
    for (const session of report.sessions) {
      const secs = sessionTrackedSeconds(session)
      hoursToday += secs
      secondsByUser.set(
        session.user_id,
        (secondsByUser.get(session.user_id) ?? 0) + secs
      )
      if (session.status === 'active') {
        activeMembers += 1
      }
    }
    activeMembers = Math.min(
      activeMembers,
      new Set(
        report.sessions.filter((s) => s.status === 'active').map((s) => s.user_id)
      ).size
    )
    void secondsByUser
  } catch (err) {
    reportError =
      err instanceof Error
        ? err.message
        : 'Could not load team report. Is the backend running?'
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Overview"
        subtitle="Today's team activity from the Clocksy API."
      />

      {reportError ? (
        <div
          role="alert"
          className="rounded-lg border border-border bg-status-error-bg px-4 py-3 text-sm text-text-primary"
        >
          {reportError}
          {!profile?.team_id ? (
            <p className="mt-1 text-text-secondary">
              Your admin profile has no{' '}
              <code className="font-mono text-xs">team_id</code>. Assign a team,
              then refresh.
            </p>
          ) : null}
        </div>
      ) : null}

      <StatStrip
        items={[
          {
            label: 'Hours today',
            value: formatHours(hoursToday),
            icon: Clock
          },
          {
            label: 'Active now',
            value: String(activeMembers),
            icon: Activity
          },
          {
            label: 'Team members',
            value: String(membersTotal),
            icon: Users
          },
          {
            label: 'Sessions today',
            value: String(sessionsToday),
            icon: CalendarClock
          }
        ]}
      />

      <Card className="flex items-center justify-between gap-4 p-4 text-sm text-text-secondary">
        <p>
          Signed in as{' '}
          <span className="font-medium text-text-primary">
            {user?.email ?? profile?.display_name}
          </span>
        </p>
        <Link
          href="/admin/employees"
          className="font-medium text-text-link hover:underline"
        >
          View employees →
        </Link>
      </Card>
    </div>
  )
}
