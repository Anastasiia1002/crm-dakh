import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Table({
  className,
  containerClassName,
  ...props
}: HTMLAttributes<HTMLTableElement> & { containerClassName?: string }) {
  return (
    <div className={cn('w-full overflow-x-auto scroll-thin', containerClassName)}>
      <table className={cn('w-full caption-bottom text-sm', className)} {...props} />
    </div>
  )
}

export function TableHeader({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('border-b border-border', className)} {...props} />
}

export function TableBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />
}

const stickyActionsClass =
  'sticky right-0 z-[1] bg-surface shadow-[-12px_0_12px_-12px_rgba(91,56,43,0.22)] group-hover:bg-surface-muted/40'

export function TableRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn('group border-b border-border/80 transition-colors hover:bg-surface-muted/40', className)}
      {...props}
    />
  )
}

export function TableHead({
  className,
  stickyActions,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement> & { stickyActions?: boolean }) {
  return (
    <th
      className={cn(
        'h-10 px-3 text-left align-middle text-[11px] font-medium tracking-[0.12em] text-muted uppercase first:pl-3 last:pr-3',
        stickyActions && stickyActionsClass,
        className,
      )}
      {...props}
    />
  )
}

export function TableCell({
  className,
  stickyActions,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement> & { stickyActions?: boolean }) {
  return (
    <td
      className={cn('px-3 py-3 align-middle first:pl-3 last:pr-3', stickyActions && stickyActionsClass, className)}
      {...props}
    />
  )
}
