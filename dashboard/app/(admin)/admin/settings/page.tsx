import { SettingsForm } from '@/components/settings-form'
import { fetchSettings } from '@/lib/catalog'
import { PageHeader } from '@/components/ui/page-header'

export default async function AdminSettingsPage(): Promise<JSX.Element> {
  let error: string | null = null
  let settings: Awaited<ReturnType<typeof fetchSettings>> | null = null

  try {
    settings = await fetchSettings()
  } catch (err) {
    error = err instanceof Error ? err.message : 'Could not load settings.'
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Settings"
        subtitle="Screenshot capture behaviour for the whole team."
      />

      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-border bg-status-error-bg px-4 py-3 text-sm text-text-primary"
        >
          {error}
        </div>
      ) : settings ? (
        <SettingsForm settings={settings} />
      ) : null}
    </div>
  )
}
