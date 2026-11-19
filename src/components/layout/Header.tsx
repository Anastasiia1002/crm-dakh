import { Menu } from 'lucide-react'
import { useRef } from 'react'
import { Link } from 'react-router-dom'
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
import { useDesktopNav } from '@/hooks/useDesktopNav'
import { userRoleLabel } from '@/lib/labels'
import { initials } from '@/lib/utils'

export function Header({
  menuOpen,
  onMenuOpenChange,
}: {
  menuOpen: boolean
  onMenuOpenChange: (open: boolean) => void
}) {
  const { user, logout } = useAuth()
  const desktop = useDesktopNav()
  const menuButtonRef = useRef<HTMLButtonElement>(null)

  return (
    <header className="sticky top-0 z-30 flex min-h-14 items-center justify-between gap-3 border-b border-border bg-background/92 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-sm md:px-7">
      <div className="flex min-w-0 items-center gap-2">
        <button
          ref={menuButtonRef}
          type="button"
          className="inline-flex size-11 items-center justify-center rounded-md text-foreground lg:hidden"
          onClick={() => onMenuOpenChange(true)}
          aria-label="Відкрити меню"
          aria-expanded={menuOpen}
          aria-controls="staff-mobile-nav"
        >
          <Menu className="size-5" strokeWidth={1.5} />
        </button>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <StaffNoticeMenu />

        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex min-h-11 items-center gap-2 rounded-md py-1 pr-1 pl-2 outline-none hover:bg-surface-muted">
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

      {desktop ? null : (
        <Sheet open={menuOpen} onOpenChange={onMenuOpenChange}>
          <SheetContent
            id="staff-mobile-nav"
            aria-label="Меню"
            onCloseAutoFocus={(event) => {
              event.preventDefault()
              menuButtonRef.current?.focus()
            }}
          >
            <Sidebar onNavigate={() => onMenuOpenChange(false)} />
          </SheetContent>
        </Sheet>
      )}
    </header>
  )
}
