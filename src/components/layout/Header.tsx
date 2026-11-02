import { Menu } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { StaffNoticeMenu } from '@/components/layout/StaffNoticeMenu'
import { Sidebar } from '@/components/layout/Sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { useAuth } from '@/hooks/useAuth'
import { userRoleLabel } from '@/lib/labels'
import { titleForPath } from '@/router/nav'
import { initials } from '@/lib/utils'

export function Header() {
  const location = useLocation()
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-4 border-b border-border bg-background/95 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-sm md:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="rounded-md p-2 text-foreground lg:hidden"
          onClick={() => setOpen(true)}
          aria-label="Відкрити меню"
        >
          <Menu className="size-5" strokeWidth={1.5} />
        </button>
        <h1 className="font-serif text-[1.65rem] leading-none font-medium tracking-tight">
          {titleForPath(location.pathname)}
        </h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <StaffNoticeMenu />

        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-3 rounded-md py-1 pr-1 pl-1 outline-none hover:bg-surface-muted">
              <span className="hidden text-right sm:block">
                <span className="block text-sm leading-tight">{user.firstName}</span>
                <span className="block text-[11px] text-muted-foreground">{userRoleLabel[user.role]}</span>
              </span>
              <span className="grid size-9 place-items-center rounded-full bg-primary font-serif text-sm text-primary-foreground">
                {initials(user.firstName, user.lastName)}
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                {user.firstName} {user.lastName}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/admin/profile">Мій профіль</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/admin/settings">Налаштування</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => {
                  void logout().then(() => {
                    window.location.assign(`${import.meta.env.BASE_URL.replace(/\/+$/, '')}/login`)
                  })
                }}
              >
                Вийти
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent aria-label="Меню">
          <Sidebar onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </header>
  )
}
