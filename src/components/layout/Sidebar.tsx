import { NavLink } from 'react-router-dom'
import { Logo } from '@/components/brand/Logo'
import { primaryNav, secondaryNav, type NavItem } from '@/router/nav'
import { cn } from '@/lib/utils'

function NavGroup({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  return (
    <nav className="space-y-0.5">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 border-l-2 px-4 py-2.5 text-[13.5px] tracking-wide text-sidebar-muted transition-colors',
                isActive
                  ? 'border-[#c4b49a] bg-sidebar-active text-sidebar-foreground'
                  : 'border-transparent hover:bg-sidebar-active/70 hover:text-sidebar-foreground',
              )
            }
          >
            <Icon className="size-[18px] shrink-0" strokeWidth={1.5} />
            <span>{item.label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="px-6 pt-7 pb-6">
        <Logo className="w-full max-w-[11.75rem]" />
        <p className="mt-3 text-[10px] tracking-[0.22em] text-sidebar-muted uppercase">Адмінпанель</p>
      </div>
      <div className="flex-1">
        <NavGroup items={primaryNav} onNavigate={onNavigate} />
      </div>
      <div className="border-t border-sidebar-border py-4">
        <NavGroup items={secondaryNav} onNavigate={onNavigate} />
      </div>
    </div>
  )
}
