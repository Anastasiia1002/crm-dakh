import type { ReactNode } from 'react'

export function LoadingState() {
  return <p className="py-16 text-sm text-muted-foreground">Завантаження…</p>
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
    <div className="mb-5 flex items-end justify-between gap-4">
      <h2 className="font-serif text-[1.7rem] leading-none font-medium tracking-tight">{title}</h2>
      {action}
    </div>
  )
}
