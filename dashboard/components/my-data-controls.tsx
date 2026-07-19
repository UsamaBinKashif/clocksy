'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { deleteAllMyDataAction } from '@/lib/actions'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

/**
 * Ethical-monitoring control: lets an employee erase all of their own tracked
 * data (sessions, activity, screenshots). Requires an explicit confirm step.
 */
export function MyDataControls(): JSX.Element {
  const [confirming, setConfirming] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function erase(): void {
    setError(null)
    startTransition(async () => {
      try {
        await deleteAllMyDataAction()
        setDone(true)
        setConfirming(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Delete failed')
      }
    })
  }

  return (
    <div className="rounded-lg border border-border bg-surface-elevated p-4">
      <p className="text-sm font-medium">Your data</p>
      <p className="mt-1 text-sm text-text-secondary">
        You can permanently delete all of your tracked sessions, activity, and
        screenshots at any time.
      </p>

      {done ? (
        <p className="mt-3 flex items-center gap-1.5 text-sm text-status-active">
          <CheckCircle2 className="h-4 w-4" />
          Your tracked data has been deleted.
        </p>
      ) : confirming ? (
        <div className="mt-3 flex items-center gap-2">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={pending}
            onClick={erase}
          >
            {pending ? (
              <>
                <Spinner size="xs" /> Deleting…
              </>
            ) : (
              'Yes, delete everything'
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => setConfirming(false)}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setConfirming(true)}
          className="mt-3 border-status-error text-status-error hover:bg-status-error-bg hover:text-status-error"
        >
          Delete all my data
        </Button>
      )}

      {error ? <p className="mt-2 text-sm text-status-error">{error}</p> : null}
    </div>
  )
}
