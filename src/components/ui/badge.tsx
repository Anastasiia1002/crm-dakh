import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-sm border border-transparent py-0.5 pr-2 pl-1.5 text-[11px] font-medium tracking-wide whitespace-nowrap',
  {
    variants: {
      tone: {
        neutral: 'border-border bg-surface-muted text-muted-foreground',
        pending: 'border-status-pending-mark/30 bg-status-pending text-status-pending-foreground',
        confirmed: 'border-status-confirmed-mark/25 bg-status-confirmed text-status-confirmed-foreground',
        checkedIn: 'border-status-checked-in-mark/25 bg-status-checked-in text-status-checked-in-foreground',
        checkedOut: 'border-status-checked-out-mark/30 bg-status-checked-out text-status-checked-out-foreground',
        cancelled: 'border-status-cancelled-mark/30 bg-status-cancelled text-status-cancelled-foreground',
        noShow: 'border-status-no-show-mark/30 bg-status-no-show text-status-no-show-foreground',
        success: 'border-status-checked-in-mark/25 bg-status-checked-in text-status-checked-in-foreground',
        warning: 'border-status-pending-mark/30 bg-status-pending text-status-pending-foreground',
      },
    },
    defaultVariants: {
      tone: 'neutral',
    },
  },
)

const markClass: Record<NonNullable<VariantProps<typeof badgeVariants>['tone']>, string> = {
  neutral: 'bg-muted',
  pending: 'bg-status-pending-mark',
  confirmed: 'bg-status-confirmed-mark',
  checkedIn: 'bg-status-checked-in-mark',
  checkedOut: 'bg-status-checked-out-mark',
  cancelled: 'bg-status-cancelled-mark',
  noShow: 'bg-status-no-show-mark',
  success: 'bg-status-checked-in-mark',
  warning: 'bg-status-pending-mark',
}

export function Badge({
  className,
  tone,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return (
    <span className={cn(badgeVariants({ tone }), className)} {...props}>
      <span className={cn('size-1.5 shrink-0 rounded-full', markClass[tone ?? 'neutral'])} aria-hidden />
      {children}
    </span>
  )
}
