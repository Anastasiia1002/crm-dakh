import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
  {
    variants: {
      tone: {
        neutral: 'bg-surface-muted text-muted-foreground',
        pending: 'bg-status-pending text-status-pending-foreground',
        confirmed: 'bg-status-confirmed text-status-confirmed-foreground',
        checkedIn: 'bg-status-checked-in text-status-checked-in-foreground',
        checkedOut: 'bg-status-checked-out text-status-checked-out-foreground',
        cancelled: 'bg-status-cancelled text-status-cancelled-foreground',
        noShow: 'bg-status-no-show text-status-no-show-foreground',
        success: 'bg-status-checked-in text-status-checked-in-foreground',
        warning: 'bg-status-pending text-status-pending-foreground',
      },
    },
    defaultVariants: {
      tone: 'neutral',
    },
  },
)

export function Badge({
  className,
  tone,
  ...props
}: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />
}
