'use client'

import { useState, useTransition } from 'react'
import { KeyRound, ShieldCheck } from 'lucide-react'
import type { ApiKey } from '@/types'
import { createApiKeyAction, revokeApiKeyAction } from '@/lib/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DataTable, type DataTableColumn } from '@/components/ui/data-table'
import { StatusPill } from '@/components/ui/status-pill'

export function ApiKeysManager({ keys }: { keys: ApiKey[] }): JSX.Element {
  const [pending, startTransition] = useTransition()
  const [name, setName] = useState('')
  const [newToken, setNewToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function create(): void {
    setError(null)
    setNewToken(null)
    startTransition(async () => {
      try {
        const { token } = await createApiKeyAction(name.trim() || 'API key')
        setNewToken(token)
        setName('')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not create key')
      }
    })
  }

  function revoke(id: string): void {
    setError(null)
    startTransition(async () => {
      try {
        await revokeApiKeyAction(id)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not revoke key')
      }
    })
  }

  const columns: DataTableColumn<ApiKey>[] = [
    { key: 'name', header: 'Name', headerIcon: KeyRound, emphasize: true, render: (k) => k.name },
    {
      key: 'prefix',
      header: 'Prefix',
      render: (k) => (
        <span className="font-mono text-text-secondary">clk_{k.prefix}…</span>
      )
    },
    {
      key: 'last_used',
      header: 'Last used',
      nowrap: true,
      render: (k) =>
        k.last_used_at ? new Date(k.last_used_at).toLocaleString() : 'Never'
    },
    {
      key: 'status',
      header: 'Status',
      render: (k) => (
        <StatusPill tone={k.revoked_at ? 'neutral' : 'active'}>
          {k.revoked_at ? 'Revoked' : 'Active'}
        </StatusPill>
      )
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (k) =>
        k.revoked_at ? null : (
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => revoke(k.id)}
            className="text-status-error hover:text-status-error"
          >
            Revoke
          </Button>
        )
    }
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface-elevated p-4">
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="key-name">Key name</Label>
          <Input
            id="key-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Zapier integration"
          />
        </div>
        <Button type="button" disabled={pending} onClick={create}>
          Create key
        </Button>
      </div>

      {error ? <p className="text-sm text-status-error">{error}</p> : null}

      {newToken ? (
        <div className="rounded-lg border border-border bg-status-active-bg p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-text-primary">
            <ShieldCheck className="h-4 w-4 text-status-active" />
            Copy this key now — it won&apos;t be shown again:
          </p>
          <code className="mt-2 block break-all rounded-md border border-border bg-surface-elevated px-3 py-2 font-mono text-sm">
            {newToken}
          </code>
          <p className="mt-2 text-xs text-text-secondary">
            Use it as <code>Authorization: Bearer {'<key>'}</code> or an{' '}
            <code>x-api-key</code> header against <code>/v1</code>.
          </p>
        </div>
      ) : null}

      <DataTable
        columns={columns}
        data={keys}
        rowKey={(k) => k.id}
        emptyTitle="No API keys yet"
        emptyDescription="Create a key above to access the public API."
      />
    </div>
  )
}
