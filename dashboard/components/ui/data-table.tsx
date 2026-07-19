import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EmptyState, type EmptyAction } from '@/components/ui/empty-state'

export interface DataTableColumn<T> {
  key: string
  header: React.ReactNode
  render: (row: T) => React.ReactNode
  align?: 'left' | 'right' | 'center'
  width?: number | string
  headerIcon?: LucideIcon
  /** First data column is emphasized (heading color) by default. */
  emphasize?: boolean
  nowrap?: boolean
  className?: string
}

export interface OnboardingEmpty {
  icon?: LucideIcon
  title: string
  description?: React.ReactNode
  steps?: React.ReactNode[]
  primaryAction?: EmptyAction
  secondaryAction?: EmptyAction
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  data: T[]
  rowKey: (row: T) => string
  /** Set false when nested inside a bordered panel. */
  bordered?: boolean
  columnBorders?: boolean
  stickyHeader?: boolean
  maxHeight?: number
  isLoading?: boolean
  skeletonRows?: number
  isRowMuted?: (row: T) => boolean
  /** Zero-result / search-empty UI. */
  emptyState?: React.ReactNode
  emptyTitle?: string
  emptyDescription?: React.ReactNode
  /** True first-load empty (no data in the DB yet). Gate at the call site. */
  onboardingEmpty?: OnboardingEmpty
  className?: string
}

const ALIGN: Record<'left' | 'right' | 'center', string> = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center'
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  bordered = true,
  columnBorders = true,
  stickyHeader = false,
  maxHeight,
  isLoading = false,
  skeletonRows = 5,
  isRowMuted,
  emptyState,
  emptyTitle,
  emptyDescription,
  onboardingEmpty,
  className
}: DataTableProps<T>): JSX.Element {
  const colCount = columns.length
  const isEmpty = !isLoading && data.length === 0

  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg',
        bordered && 'border border-border',
        className
      )}
    >
      <div
        className={cn('w-full overflow-auto', maxHeight && 'overflow-y-auto')}
        style={maxHeight ? { maxHeight } : undefined}
      >
        <table className="w-full border-collapse text-left text-sm">
          <thead
            className={cn(
              'bg-surface text-text-secondary',
              stickyHeader && 'sticky top-0 z-10'
            )}
          >
            <tr className="border-b border-border">
              {columns.map((col, i) => {
                const Icon = col.headerIcon
                return (
                  <th
                    key={col.key}
                    scope="col"
                    style={col.width ? { width: col.width } : undefined}
                    className={cn(
                      'h-9 px-3 text-xs font-medium',
                      ALIGN[col.align ?? 'left'],
                      columnBorders && i > 0 && 'border-l border-border-subtle'
                    )}
                  >
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5',
                        col.align === 'right' && 'flex-row-reverse'
                      )}
                    >
                      {Icon ? (
                        <Icon className="h-3 w-3 text-text-muted" />
                      ) : null}
                      {col.header}
                    </span>
                  </th>
                )
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-border">
            {isLoading
              ? Array.from({ length: skeletonRows }).map((_, r) => (
                  <tr key={`sk-${r}`}>
                    {columns.map((col, i) => (
                      <td
                        key={col.key}
                        className={cn(
                          'px-3 py-2.5',
                          columnBorders &&
                            i > 0 &&
                            'border-l border-border-subtle'
                        )}
                      >
                        <span className="block h-3.5 w-full max-w-[8rem] animate-pulse rounded bg-surface-sunken" />
                      </td>
                    ))}
                  </tr>
                ))
              : null}

            {isEmpty ? (
              <tr>
                <td colSpan={colCount} className="p-0">
                  {onboardingEmpty && !emptyState ? (
                    <EmptyState {...onboardingEmpty} />
                  ) : emptyState ? (
                    emptyState
                  ) : (
                    <div className="px-4 py-12 text-center">
                      <p className="text-sm font-medium text-text-primary">
                        {emptyTitle ?? 'Nothing here yet'}
                      </p>
                      {emptyDescription ? (
                        <p className="mt-1 text-sm text-text-secondary">
                          {emptyDescription}
                        </p>
                      ) : null}
                    </div>
                  )}
                </td>
              </tr>
            ) : null}

            {!isLoading && !isEmpty
              ? data.map((row) => {
                  const muted = isRowMuted?.(row) ?? false
                  return (
                    <tr
                      key={rowKey(row)}
                      className={cn(
                        'transition-colors hover:bg-surface/60',
                        muted && 'opacity-55'
                      )}
                    >
                      {columns.map((col, i) => {
                        const emphasize = col.emphasize ?? i === 0
                        return (
                          <td
                            key={col.key}
                            className={cn(
                              'px-3 py-2.5 align-middle',
                              ALIGN[col.align ?? 'left'],
                              emphasize
                                ? 'font-medium text-text-primary'
                                : 'text-text-secondary',
                              col.nowrap && 'whitespace-nowrap',
                              columnBorders &&
                                i > 0 &&
                                'border-l border-border-subtle',
                              col.className
                            )}
                          >
                            {col.render(row)}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })
              : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
