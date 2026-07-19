import { ProjectsManager } from '@/components/projects-manager'
import { fetchClients, fetchProjects } from '@/lib/catalog'
import { PageHeader } from '@/components/ui/page-header'

export default async function AdminProjectsPage(): Promise<JSX.Element> {
  let error: string | null = null
  let projects: Awaited<ReturnType<typeof fetchProjects>> = []
  let clients: Awaited<ReturnType<typeof fetchClients>> = []

  try {
    ;[projects, clients] = await Promise.all([
      fetchProjects(true),
      fetchClients()
    ])
  } catch (err) {
    error = err instanceof Error ? err.message : 'Could not load projects.'
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Projects"
        subtitle="Projects and clients that employees can track time against."
      />

      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-border bg-status-error-bg px-4 py-3 text-sm text-text-primary"
        >
          {error}
        </div>
      ) : (
        <ProjectsManager projects={projects} clients={clients} />
      )}
    </div>
  )
}
