import { Outlet } from 'react-router-dom'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'

export function AdminLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-sidebar-border pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] lg:block">
        <Sidebar />
      </aside>
      <div className="lg:pl-64">
        <Header />
        <main className="px-4 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:px-8 md:pt-8 md:pb-[max(2rem,env(safe-area-inset-bottom))]">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
