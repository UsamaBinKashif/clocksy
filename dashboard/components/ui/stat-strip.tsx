import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface StatItem {
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
  icon?: LucideIcon
}

/*
 * KPI row as ONE bordered surface with internal dividers (Contacts pattern) —
 * not a grid of separate cards. Icons use a quiet chip; no brand tint on the
 * surface itself.
 */
export function StatStrip({
  items,
  className
}: {
  items: StatItem[]
  className?: string
}): JSX.Element {
  return (
    <div
      className={cn(
        'grid grid-cols-2 divide-x divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface-elevated sm:grid-cols-4 sm:divide-y-0',
        className
      )}
    >
      {items.map((item) => {
        const Icon = item.icon
        return (
          <div key={item.label} className="flex flex-col gap-1 p-4">
            <div className="flex items-center gap-2">
              {Icon ? (
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-surface-sunken text-text-secondary">
                  <Icon className="h-3.5 w-3.5" />
                </span>
              ) : null}
              <span className="text-xs font-medium text-text-muted">
                {item.label}
              </span>
            </div>
            <span className="text-2xl font-semibold tracking-tight tabular-nums">
              {item.value}
            </span>
            {item.hint ? (
              <span className="text-xs text-text-secondary">{item.hint}</span>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
