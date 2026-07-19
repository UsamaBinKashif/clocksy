'use client'

import { useState } from 'react'
import { ImageOff } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'

interface ScreenshotThumbProps {
  id: string
  takenAt: string
  activityPercent: number
}

/**
 * Fetches a short-lived signed URL from the backend on demand (never stores
 * permanent Storage URLs in the page).
 */
export function ScreenshotThumb({
  id,
  takenAt,
  activityPercent
}: ScreenshotThumbProps): JSX.Element {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function load(): Promise<void> {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/screenshots/${id}/url`)
      if (!res.ok) throw new Error(`Failed (${res.status})`)
      const body = (await res.json()) as { url: string }
      setUrl(body.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={() => void load()}
      className="flex flex-col overflow-hidden rounded-lg border border-border bg-surface-elevated text-left transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex aspect-video items-center justify-center bg-surface-sunken text-xs text-text-muted">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="Screenshot" className="h-full w-full object-cover" />
        ) : loading ? (
          <Spinner size="sm" />
        ) : error ? (
          <span className="flex items-center gap-1.5 px-2 text-center text-status-error">
            <ImageOff className="h-3.5 w-3.5" />
            {error}
          </span>
        ) : (
          'Click to load'
        )}
      </div>
      <div className="flex flex-col gap-1.5 px-3 py-2 text-xs text-text-secondary">
        <div className="flex items-center justify-between gap-2">
          <span>{new Date(takenAt).toLocaleString()}</span>
          <span className="font-medium tabular-nums">
            {activityPercent}% active
          </span>
        </div>
        <ActivityBar percent={activityPercent} />
      </div>
    </button>
  )
}

/** Compact activity-level meter; color scales with the percentage. */
function ActivityBar({ percent }: { percent: number }): JSX.Element {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)))
  const color =
    clamped >= 70
      ? 'bg-status-active'
      : clamped >= 40
        ? 'bg-status-idle'
        : 'bg-status-error'

  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken"
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Activity level"
    >
      <div className={`h-full ${color}`} style={{ width: `${clamped}%` }} />
    </div>
  )
}
