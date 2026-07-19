import { cn } from '@/lib/utils'

const SIZES = { xs: 14, sm: 18, md: 24, lg: 32 } as const

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
