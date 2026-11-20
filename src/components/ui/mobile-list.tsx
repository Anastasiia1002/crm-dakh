import { Children, type HTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

function presentChildren(children: ReactNode) {
  return Children.toArray(children)
}

export function MobileList({ className, ...props }: HTMLAttributes<HTMLUListElement>) {
  return (
    <ul
      className={cn('divide-y divide-border overflow-x-hidden rounded-md border border-border bg-surface md:hidden', className)}
      {...props}
    />
  )
}

export function MobileCard({ className, ...props }: HTMLAttributes<HTMLLIElement>) {
  return <li className={cn('px-3 py-2.5', className)} {...props} />
}

export function MobileCardHeader({
  title,
  actions,
}: {
  title: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="flex items-start gap-1">
      <div className="min-w-0 flex-1 break-words text-[15px] leading-5 font-medium">{title}</div>
      <MobileCardActions>{actions}</MobileCardActions>
    </div>
  )
}

export function MobileCardActions({ children }: { children?: ReactNode }) {
  return (
    <div
      className="flex size-11 shrink-0 items-start justify-center"
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      {children}
    </div>
  )
}

export function MobileCardBadges({ children }: { children?: ReactNode }) {
  const items = presentChildren(children)
  if (items.length === 0) return null
  return <div className="mt-1.5 flex flex-wrap gap-1">{items}</div>
}

export function MobileCardDetails({ children }: { children?: ReactNode }) {
  const items = presentChildren(children)
  if (items.length === 0) return null
  return <div className="mt-1.5 space-y-0.5 text-sm">{items}</div>
}

export function MobileCardDetail({
  label,
  children,
}: {
  label: string
  children?: ReactNode
}) {
  if (children == null || children === false) return null
  return (
    <div className="flex items-start gap-2">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words">{children}</span>
    </div>
  )
}

export const mobileCardControlClass =
  'rounded-sm text-left underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50'
