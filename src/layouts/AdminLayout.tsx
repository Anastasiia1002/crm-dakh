import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { useDesktopNav } from '@/hooks/useDesktopNav'

export function AdminLayout() {
  const desktop = useDesktopNav()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (desktop) setMenuOpen(false)
  }, [desktop])

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      {desktop ? (
        <aside className="fixed inset-y-0 left-0 z-40 w-60 border-r border-sidebar-border pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
          <Sidebar />
        </aside>
      ) : null}
      <div className="min-w-0 lg:pl-60">
        <Header menuOpen={menuOpen} onMenuOpenChange={setMenuOpen} />
        <main className="min-w-0 px-4 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:px-7 md:pt-6 md:pb-[max(2rem,env(safe-area-inset-bottom))]">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
