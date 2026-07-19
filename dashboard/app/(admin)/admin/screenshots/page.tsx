import { Camera } from 'lucide-react'
import { ScreenshotThumb } from '@/components/screenshot-thumb'
import { fetchTeamScreenshots } from '@/lib/catalog'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'

export default async function AdminScreenshotsPage(): Promise<JSX.Element> {
  let error: string | null = null
  let screenshots: Awaited<ReturnType<typeof fetchTeamScreenshots>> = []

  try {
    screenshots = await fetchTeamScreenshots({ limit: 60 })
  } catch (err) {
    error = err instanceof Error ? err.message : 'Could not load screenshots.'
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Screenshots"
        subtitle="Most recent screenshots across the team, with activity level."
      />

      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-border bg-status-error-bg px-4 py-3 text-sm text-text-primary"
        >
          {error}
        </div>
      ) : null}

      {screenshots.length === 0 && !error ? (
        <div className="rounded-lg border border-border">
          <EmptyState
            icon={Camera}
            title="No screenshots yet"
            description="Screenshots captured by the desktop app will show up here."
          />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {screenshots.map((shot) => (
            <div key={shot.id} className="flex flex-col gap-1">
              <p className="truncate text-xs font-medium text-text-secondary">
                {shot.user_name}
              </p>
              <ScreenshotThumb
                id={shot.id}
                takenAt={shot.taken_at}
                activityPercent={Number(shot.activity_percent)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
