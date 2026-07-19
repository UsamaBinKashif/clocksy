import { forwardRef } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/*
 * Brand isolation: the filled `default` (orange) is the only brand-tinted
 * variant — reserve it for the single primary CTA on a view. Everything else
 * stays on neutral chrome.
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-orange-400 text-orange-foreground hover:bg-orange-500',
        secondary:
          'border border-border bg-surface-elevated text-text-primary hover:bg-nav-active',
        outline:
          'border border-border bg-transparent text-text-primary hover:bg-nav-active',
        ghost: 'text-text-secondary hover:bg-nav-active hover:text-text-primary',
        link: 'text-text-link underline-offset-4 hover:underline',
        destructive:
          'bg-[var(--status-error)] text-text-inverse hover:opacity-90'
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
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
