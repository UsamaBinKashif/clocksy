'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2 } from 'lucide-react'
import type { TeamSettings } from '@/types'
import { updateSettingsAction } from '@/lib/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'

export function SettingsForm({
  settings
}: {
  settings: TeamSettings
}): JSX.Element {
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  return (
    <form
      action={(formData) => {
        setMessage(null)
        setError(null)
        startTransition(async () => {
          try {
            await updateSettingsAction(formData)
            setMessage('Settings saved.')
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Save failed')
          }
        })
      }}
      className="flex max-w-lg flex-col gap-5 rounded-lg border border-border bg-surface-elevated p-5"
    >
      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          name="screenshots_enabled"
          defaultChecked={settings.screenshots_enabled}
          className="h-4 w-4 rounded border-border accent-orange-400"
        />
        <span className="font-medium">Enable screenshots</span>
      </label>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="min-interval">Min interval (seconds)</Label>
          <Input
            id="min-interval"
            type="number"
            name="screenshot_min_interval_sec"
            min={30}
            defaultValue={settings.screenshot_min_interval_sec}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="max-interval">Max interval (seconds)</Label>
          <Input
            id="max-interval"
            type="number"
            name="screenshot_max_interval_sec"
            min={30}
            defaultValue={settings.screenshot_max_interval_sec}
          />
        </div>
      </div>

      <p className="text-xs text-text-muted">
        Screenshots are captured at a random time between the min and max
        interval. Set both to the same value for a fixed interval.
      </p>

      {message ? (
        <p className="flex items-center gap-1.5 text-sm text-status-active">
          <CheckCircle2 className="h-4 w-4" />
          {message}
        </p>
      ) : null}
      {error ? <p className="text-sm text-status-error">{error}</p> : null}

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? (
          <>
            <Spinner size="xs" /> Saving…
          </>
        ) : (
          'Save settings'
        )}
      </Button>
    </form>
  )
}
