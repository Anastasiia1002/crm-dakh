import { Outlet } from 'react-router-dom'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'

export function AdminLayout() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 border-r border-sidebar-border pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] lg:block">
        <Sidebar />
      </aside>
      <div className="min-w-0 lg:pl-60">
        <Header />
        <main className="min-w-0 px-4 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:px-7 md:pt-6 md:pb-[max(2rem,env(safe-area-inset-bottom))]">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
