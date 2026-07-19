import { cn } from '@/lib/utils'

export type StatusTone = 'active' | 'idle' | 'offline' | 'error' | 'neutral'

const TONES: Record<StatusTone, { pill: string; dot: string }> = {
  active: {
    pill: 'bg-status-active-bg text-status-active',
    dot: 'bg-status-active'
  },
  idle: {
    pill: 'bg-status-idle-bg text-status-idle',
    dot: 'bg-status-idle'
  },
  offline: {
    pill: 'bg-status-offline-bg text-text-muted',
    dot: 'bg-status-offline'
  },
  error: {
    pill: 'bg-status-error-bg text-status-error',
    dot: 'bg-status-error'
  },
  neutral: {
    pill: 'bg-nav-active text-text-secondary',
    dot: 'bg-text-muted'
  }
}

export function StatusPill({
  tone = 'neutral',
  dot = true,
  className,
  children
}: {
  tone?: StatusTone
  dot?: boolean
  className?: string
  children: React.ReactNode
}): JSX.Element {
  const t = TONES[tone]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium capitalize',
        t.pill,
        className
      )}
    >
      {dot ? (
        <span className={cn('h-1.5 w-1.5 rounded-full', t.dot)} aria-hidden />
      ) : null}
      {children}
    </span>
  )
}
