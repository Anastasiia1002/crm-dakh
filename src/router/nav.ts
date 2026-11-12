import {
  BarChart3,
  BedDouble,
  CalendarDays,
  ConciergeBell,
  ContactRound,
  House,
  NotebookPen,
  ScrollText,
  Settings,
  Tags,
  Ticket,
  Users,
  type LucideIcon,
} from 'lucide-react'

export type NavItem = {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

export const primaryNav: NavItem[] = [
  { to: '/admin', label: 'Огляд', icon: House, end: true },
  { to: '/admin/analytics', label: 'Аналітика', icon: BarChart3 },
  { to: '/admin/bookings', label: 'Бронювання', icon: NotebookPen },
  { to: '/admin/calendar', label: 'Шахматка', icon: CalendarDays },
  { to: '/admin/guests', label: 'Клієнти', icon: ContactRound },
  { to: '/admin/accommodations', label: 'Номери та будиночки', icon: BedDouble },
  { to: '/admin/rates', label: 'Тарифи', icon: Tags },
  { to: '/admin/services', label: 'Послуги', icon: ConciergeBell },
  { to: '/admin/promo-codes', label: 'Промокоди', icon: Ticket },
]

export const secondaryNav: NavItem[] = [
  { to: '/admin/settings', label: 'Налаштування', icon: Settings },
  { to: '/admin/users', label: 'Користувачі', icon: Users },
  { to: '/admin/audit', label: 'Журнал дій', icon: ScrollText },
]

export function titleForPath(pathname: string) {
  if (pathname === '/admin/bookings/new') return 'Нове бронювання'
  if (/^\/admin\/bookings\/[^/]+\/edit$/.test(pathname)) return 'Редагування бронювання'
  if (pathname.startsWith('/admin/bookings/')) return 'Бронювання'
  if (pathname === '/admin/profile') return 'Мій профіль'
  if (pathname.startsWith('/admin/guests/')) return 'Клієнт'
  const item = [...primaryNav, ...secondaryNav].find((entry) =>
    entry.end ? pathname === entry.to : pathname === entry.to || pathname.startsWith(`${entry.to}/`),
  )
  return item?.label ?? 'DAKH'
}
