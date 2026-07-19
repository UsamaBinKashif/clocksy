import { forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/*
 * Brand isolation: `start` (yellow) is reserved for the go-actions of the
 * tracker (Start / Resume) — Clocksy's active-session accent. `default`
 * (orange) is the generic primary CTA. Everything else stays on neutral chrome.
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-orange-400 text-orange-foreground hover:bg-orange-500',
        start: 'bg-yellow-400 text-yellow-foreground hover:bg-yellow-500',
        secondary:
          'border border-border bg-surface-elevated text-text-primary hover:bg-nav-active',
        outline:
          'border border-border bg-transparent text-text-primary hover:bg-nav-active',
        ghost: 'text-text-secondary hover:bg-nav-active hover:text-text-primary',
        destructive: 'bg-[var(--status-error)] text-text-inverse hover:opacity-90'
      },
      size: {
        default: 'h-9 px-4',
        sm: 'h-8 px-3',
        lg: 'h-10 px-6',
        icon: 'h-9 w-9'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
)
Button.displayName = 'Button'

export { Button, buttonVariants }
