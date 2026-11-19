import { Slot, Slottable } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import type { ButtonHTMLAttributes, MouseEvent, Ref } from 'react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-40 aria-disabled:pointer-events-none aria-disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-surface-muted',
        outline: 'border border-border bg-surface text-foreground hover:bg-surface-muted',
        ghost: 'text-foreground hover:bg-surface-muted',
        destructive: 'bg-destructive text-primary-foreground hover:bg-destructive/90',
      },
      size: {
        default: 'h-11 px-4',
        sm: 'h-9 min-h-9 px-3 text-[13px]',
        lg: 'h-11 px-5',
        icon: 'size-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    loading?: boolean
  }

export function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  disabled,
  children,
  onClick,
  ref,
  ...props
}: ButtonProps & { ref?: Ref<HTMLButtonElement> }) {
  const inactive = Boolean(disabled || loading)
  const classes = cn(buttonVariants({ variant, size }), className)
  const spinner = loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null

  if (asChild) {
    return (
      <Slot
        ref={ref}
        className={classes}
        aria-busy={loading || undefined}
        aria-disabled={inactive || undefined}
        tabIndex={inactive ? -1 : undefined}
        onClick={
          inactive
            ? (event) => {
                event.preventDefault()
                event.stopPropagation()
              }
            : onClick
              ? (event) => onClick(event as MouseEvent<HTMLButtonElement>)
              : undefined
        }
        {...props}
      >
        {spinner}
        <Slottable>{children}</Slottable>
      </Slot>
    )
  }

  return (
    <button
      ref={ref}
      className={classes}
      disabled={inactive}
      aria-busy={loading || undefined}
      aria-disabled={inactive || undefined}
      onClick={onClick}
      {...props}
    >
      {spinner}
      {children}
    </button>
  )
}
