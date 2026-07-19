'use client'

import { useState, useTransition } from 'react'
import { FolderKanban, Trash2, Users } from 'lucide-react'
import type { Client, Project } from '@/types'
import {
  createClientAction,
  createProjectAction,
  deleteClientAction,
  deleteProjectAction,
  setProjectArchivedAction
} from '@/lib/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DataTable, type DataTableColumn } from '@/components/ui/data-table'
import { StatusPill } from '@/components/ui/status-pill'

interface ProjectsManagerProps {
  projects: Project[]
  clients: Client[]
}

const selectClass =
  'h-9 w-full rounded-md border border-border bg-surface-elevated px-3 text-sm text-text-primary shadow-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring'

export function ProjectsManager({
  projects,
  clients
}: ProjectsManagerProps): JSX.Element {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function run(fn: () => Promise<void>): void {
    setError(null)
    startTransition(async () => {
      try {
        await fn()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Action failed')
      }
    })
  }

  const projectColumns: DataTableColumn<Project>[] = [
    { key: 'name', header: 'Project', headerIcon: FolderKanban, emphasize: true, render: (p) => p.name },
    {
      key: 'client',
      header: 'Client',
      headerIcon: Users,
      render: (p) => p.client_name ?? '—'
    },
    {
      key: 'status',
      header: 'Status',
      render: (p) => (
        <StatusPill tone={p.archived ? 'neutral' : 'active'}>
          {p.archived ? 'Archived' : 'Active'}
        </StatusPill>
      )
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (p) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => run(() => setProjectArchivedAction(p.id, !p.archived))}
          >
            {p.archived ? 'Unarchive' : 'Archive'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => run(() => deleteProjectAction(p.id))}
            className="text-status-error hover:text-status-error"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ]

  return (
    <div className="flex flex-col gap-8">
      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-border bg-status-error-bg px-4 py-3 text-sm text-text-primary"
        >
          {error}
        </div>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-md font-semibold tracking-tight">New project</h2>
        <form
          action={(formData) => run(() => createProjectAction(formData))}
          className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface-elevated p-4"
        >
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="project-name">Name</Label>
            <Input
              id="project-name"
              name="name"
              required
              placeholder="Project name"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="project-client">Client</Label>
            <select id="project-client" name="client_id" className={selectClass}>
              <option value="">No client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" disabled={pending}>
            Add project
          </Button>
        </form>

        <DataTable
          columns={projectColumns}
          data={projects}
          rowKey={(p) => p.id}
          emptyTitle="No projects yet"
          emptyDescription="Create your first project above."
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-md font-semibold tracking-tight">Clients</h2>
        <form
          action={(formData) => run(() => createClientAction(formData))}
          className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface-elevated p-4"
        >
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="client-name">Name</Label>
            <Input
              id="client-name"
              name="name"
              required
              placeholder="Client name"
            />
          </div>
          <Button type="submit" disabled={pending}>
            Add client
          </Button>
        </form>

        <ul className="divide-y divide-border rounded-lg border border-border bg-surface-elevated">
          {clients.length === 0 ? (
            <li className="px-4 py-6 text-sm text-text-secondary">
              No clients yet.
            </li>
          ) : (
            clients.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between px-4 py-2.5 text-sm"
              >
                <span className="font-medium">{c.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => run(() => deleteClientAction(c.id))}
                  className="text-status-error hover:text-status-error"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  )
}
