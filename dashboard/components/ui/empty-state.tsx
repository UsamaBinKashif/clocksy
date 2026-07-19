import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export interface EmptyAction {
  label: string
  onClick?: () => void
  href?: string
}

/*
 * First-load empty state (no data in the DB yet): icon chip, title, subtitle,
 * optional numbered steps, and a primary/secondary CTA — centered and
 * dark-mode safe. Use ONLY on true first-load empty; for zero-result
 * search/filter keep the plain search-empty copy instead.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  steps,
  primaryAction,
  secondaryAction,
  className
}: {
  icon?: LucideIcon
  title: string
  description?: React.ReactNode
  steps?: React.ReactNode[]
  primaryAction?: EmptyAction
  secondaryAction?: EmptyAction
  className?: string
}): JSX.Element {
  return (
    <div
      className={cn(
        'mx-auto flex max-w-md flex-col items-center px-6 py-12 text-center',
        className
      )}
    >
      {Icon ? (
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface-sunken text-text-secondary">
          <Icon className="h-6 w-6" />
        </span>
      ) : null}
      <h3 className="text-md font-semibold tracking-tight text-text-primary">
        {title}
      </h3>
      {description ? (
        <p className="mt-1.5 text-sm text-text-secondary">{description}</p>
      ) : null}

      {steps && steps.length > 0 ? (
        <ol className="mt-5 w-full space-y-2 text-left">
          {steps.map((step, i) => (
            <li key={i} className="flex gap-3 text-sm text-text-secondary">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-xs font-medium text-text-primary">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      ) : null}

      {primaryAction || secondaryAction ? (
        <div className="mt-6 flex items-center gap-2">
          {primaryAction ? (
            primaryAction.href ? (
              <Button asChild>
                <a href={primaryAction.href}>{primaryAction.label}</a>
              </Button>
            ) : (
              <Button onClick={primaryAction.onClick}>
                {primaryAction.label}
              </Button>
            )
          ) : null}
          {secondaryAction ? (
            secondaryAction.href ? (
              <Button asChild variant="outline">
                <a href={secondaryAction.href}>{secondaryAction.label}</a>
              </Button>
            ) : (
              <Button variant="outline" onClick={secondaryAction.onClick}>
                {secondaryAction.label}
              </Button>
            )
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
