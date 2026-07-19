import { cn } from '@/lib/utils'

/*
 * Inline page chrome: title + optional subtitle on the left, actions on the
 * right. Hairline separation only — no heavy divider, no brand tint.
 */
export function PageHeader({
  title,
  subtitle,
  actions,
  className
}: {
  title: React.ReactNode
  subtitle?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}): JSX.Element {
  return (
    <div
      className={cn(
        'flex flex-wrap items-start justify-between gap-3',
        className
      )}
    >
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-text-primary">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  )
}
