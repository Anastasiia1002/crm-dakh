import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const ROW_BG_TRANSITION = 'transition-none'
const stickyActionsClass =
  'sticky right-0 z-[1] bg-[var(--row-bg)] shadow-[-12px_0_12px_-12px_rgba(91,56,43,0.22)]'

export function Table({
  className,
  containerClassName,
  ...props
}: HTMLAttributes<HTMLTableElement> & { containerClassName?: string }) {
  return (
    <div className={cn('w-full overflow-x-auto scroll-thin rounded-md border border-border bg-[var(--table-row-bg)]', containerClassName)}>
      <table className={cn('w-full caption-bottom bg-[var(--table-row-bg)] text-sm', className)} {...props} />
    </div>
  )
}

export function TableHeader({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn(
        'border-b border-border [&_tr]:[--row-bg:var(--table-header-bg)] [&_tr:hover]:[--row-bg:var(--table-header-bg)] [&_tr:nth-child(even)]:[--row-bg:var(--table-header-bg)] [&_tr:focus-within]:[--row-bg:var(--table-header-bg)]',
        className,
      )}
      {...props}
    />
  )
}

export function TableBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />
}

export function TableRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        `border-b border-border/80 bg-[var(--row-bg)] ${ROW_BG_TRANSITION} [--row-bg:var(--table-row-bg)]`,
        'even:[--row-bg:var(--table-row-bg-alt)]',
        'hover:[--row-bg:var(--table-row-bg-hover)]',
        'focus-within:[--row-bg:var(--table-row-bg-hover)]',
        'aria-selected:[--row-bg:var(--table-row-bg-selected)]',
        className,
      )}
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
        `h-10 bg-[var(--row-bg)] px-3 text-left align-middle text-[11px] font-medium tracking-[0.12em] text-muted uppercase first:pl-3 last:pr-3 ${ROW_BG_TRANSITION}`,
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
      className={cn(
        `bg-[var(--row-bg)] px-3 py-3 align-middle first:pl-3 last:pr-3 ${ROW_BG_TRANSITION}`,
        stickyActions && stickyActionsClass,
        className,
      )}
      {...props}
    />
  )
}
