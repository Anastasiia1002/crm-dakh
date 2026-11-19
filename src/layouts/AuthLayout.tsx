import type { ReactNode } from 'react'
import { Logo } from '@/components/brand/Logo'

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <aside className="hidden w-[40%] flex-col justify-between bg-sidebar px-12 py-12 text-sidebar-foreground lg:flex">
        <div>
          <Logo className="w-56" />
          <p className="mt-4 text-[11px] tracking-[0.22em] text-sidebar-muted uppercase">Готель · адмінпанель</p>
        </div>
        <p className="max-w-sm font-serif text-[2.4rem] leading-[1.1] font-medium">Робочий простір персоналу DAKH</p>
        <p className="text-sm text-sidebar-muted">Бронювання, ціни та щоденна зміна — в одному місці.</p>
      </aside>
      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  )
}
