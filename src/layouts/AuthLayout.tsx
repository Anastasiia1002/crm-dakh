import type { ReactNode } from 'react'
import { Logo } from '@/components/brand/Logo'

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <aside className="hidden w-[42%] flex-col justify-between bg-sidebar px-12 py-12 text-sidebar-foreground lg:flex">
        <div>
          <Logo className="w-64" />
          <p className="mt-4 text-[11px] tracking-[0.24em] text-sidebar-muted uppercase">Готель</p>
        </div>
        <p className="max-w-xs font-serif text-4xl leading-tight font-medium">Адміністрування готелю</p>
        <p className="text-sm text-sidebar-muted">Внутрішня система</p>
      </aside>
      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  )
}
