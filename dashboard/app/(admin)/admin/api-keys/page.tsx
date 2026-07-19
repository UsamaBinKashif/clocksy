import { ApiKeysManager } from '@/components/api-keys-manager'
import { fetchApiKeys } from '@/lib/catalog'
import { PageHeader } from '@/components/ui/page-header'

export default async function AdminApiKeysPage(): Promise<JSX.Element> {
  let error: string | null = null
  let keys: Awaited<ReturnType<typeof fetchApiKeys>> = []

  try {
    keys = await fetchApiKeys()
  } catch (err) {
    error = err instanceof Error ? err.message : 'Could not load API keys.'
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="API keys"
        subtitle={
          <>
            Grant external tools read-only access to the public{' '}
            <code className="font-mono text-xs">/v1</code> API.
          </>
        }
      />

      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-border bg-status-error-bg px-4 py-3 text-sm text-text-primary"
        >
          {error}
        </div>
      ) : (
        <ApiKeysManager keys={keys} />
      )}
    </div>
  )
}
