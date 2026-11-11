import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function BookingWorkspaceSection({
  title,
  children,
  className,
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('rounded-md bg-surface px-4 py-3', className)}>
      <h3 className="text-[11px] font-medium tracking-[0.12em] text-muted uppercase">{title}</h3>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  )
}

export function BookingMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium tracking-[0.08em] text-muted uppercase">{label}</p>
      <p className="mt-1 text-sm font-medium whitespace-pre-wrap text-foreground">{value}</p>
    </div>
  )
}
