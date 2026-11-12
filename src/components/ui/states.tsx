import type { ReactNode } from 'react'

export function LoadingState({ label = 'Завантаження…' }: { label?: string }) {
  return (
    <p className="py-16 text-sm text-muted-foreground" aria-busy="true" aria-live="polite">
      {label}
    </p>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="py-12 text-sm text-muted-foreground">{children}</p>
}

export function SectionHeading({
  title,
  action,
}: {
  title: string
  action?: ReactNode
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
      <h2 className="font-serif text-[1.7rem] leading-none font-medium tracking-tight">{title}</h2>
      {action}
    </div>
  )
}
