import { cn } from '@/lib/utils'

/*
 * Sentence-case muted label (replaces SHOUTY UPPERCASE section headers).
 * Used for sidebar nav groups and quiet in-page section headings.
 */
export function SectionLabel({
  className,
  children
}: {
  className?: string
  children: React.ReactNode
}): JSX.Element {
  return (
    <p
      className={cn(
        'px-1 text-xs font-medium text-text-muted',
        className
      )}
    >
      {children}
    </p>
  )
}
