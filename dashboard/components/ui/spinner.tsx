import { cn } from '@/lib/utils'

const SIZES = {
  xs: 14,
  sm: 18,
  md: 24,
  lg: 32
} as const

/*
 * Base brand-accented ring spinner. Renders inline-flex, so a bare <Spinner />
 * is for the inline case only (buttons, table cells, field adornments). For
 * panels/routes use <PanelLoader />.
 */
export function Spinner({
  size = 'md',
  className,
  label
}: {
  size?: keyof typeof SIZES | number
  className?: string
  label?: string
}): JSX.Element {
  const px = typeof size === 'number' ? size : SIZES[size]
  return (
    <span
      role="status"
      aria-label={label ?? 'Loading'}
      className={cn('inline-flex', className)}
    >
      <span
        className="animate-spin rounded-full border-2 border-border"
        style={{
          width: px,
          height: px,
          borderTopColor: 'var(--fn-loader-accent)',
          borderRightColor: 'var(--fn-loader-accent)'
        }}
      />
    </span>
  )
}

/*
 * Centered loader for cards, modals, table bodies, workspace panels, and full
 * routes. Always centered vertically + horizontally — never top-left.
 */
export function PanelLoader({
  fill = 'parent',
  minHeight,
  size = 'md',
  label,
  className
}: {
  fill?: 'parent' | 'viewport' | 'content'
  minHeight?: number
  size?: keyof typeof SIZES | number
  label?: string
  className?: string
}): JSX.Element {
  const fillClass =
    fill === 'viewport'
      ? 'min-h-screen'
      : fill === 'content'
        ? 'min-h-[60vh]'
        : 'h-full w-full'
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 text-sm text-text-secondary',
        fillClass,
        className
      )}
      style={minHeight ? { minHeight } : undefined}
    >
      <Spinner size={size} label={label} />
      {label ? <span>{label}</span> : null}
    </div>
  )
}
