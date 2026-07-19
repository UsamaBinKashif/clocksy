import { cn } from '@/lib/utils'

/*
 * Brand lockup. The logo mark is one of the few sanctioned brand-accent
 * placements — keep it here so brand color never leaks onto chrome elsewhere.
 */
export function BrandMark({ className }: { className?: string }): JSX.Element {
  return (
    <span
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded-md bg-orange-400 text-sm font-bold text-orange-foreground',
        className
      )}
      aria-hidden
    >
      C
    </span>
  )
}

export function BrandLockup({
  subtitle,
  className
}: {
  subtitle?: string
  className?: string
}): JSX.Element {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <BrandMark />
      <div className="leading-tight">
        <p className="text-sm font-semibold text-text-primary">Clocksy</p>
        {subtitle ? (
          <p className="text-xs text-text-muted">{subtitle}</p>
        ) : null}
      </div>
    </div>
  )
}
