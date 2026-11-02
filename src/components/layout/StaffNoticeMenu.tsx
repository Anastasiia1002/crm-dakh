import { Bell } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useMarkAllStaffNoticesRead, useMarkStaffNoticeRead, useStaffNotices } from '@/hooks/useStaffNotices'
import { adminBookingRef } from '@/lib/admin-booking-view'
import { formatDate } from '@/lib/format'
import { bookingStatusLabel } from '@/lib/labels'
import { noticeTimeLabel } from '@/lib/notice-time'
import type { StaffNotice } from '@/types'

export function StaffNoticeMenu() {
  const navigate = useNavigate()
  const notices = useStaffNotices()
  const markRead = useMarkStaffNoticeRead()
  const markAll = useMarkAllStaffNoticesRead()
  const unread = notices.data?.unreadCount ?? 0
  const label = unread > 0 ? `Сповіщення, непрочитаних: ${unread}` : 'Сповіщення'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="relative rounded-md p-2 text-foreground outline-none hover:bg-surface-muted"
        aria-label={label}
      >
        <Bell className="size-[18px]" strokeWidth={1.5} />
        {unread > 0 ? (
          <span className="absolute top-1 right-1 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] leading-4 text-primary-foreground">
            {unread > 99 ? '99+' : unread}
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(20rem,calc(100vw-1.5rem))]">
        <DropdownMenuLabel>Сповіщення</DropdownMenuLabel>
        {notices.isLoading ? <p className="px-3 py-2 text-sm text-muted-foreground">Завантажуємо сповіщення…</p> : null}
        {notices.isError ? (
          <div className="space-y-2 px-3 py-2" role="alert">
            <p className="text-sm">Не вдалося завантажити сповіщення.</p>
            <button type="button" className="text-sm underline" onClick={() => void notices.refetch()}>
              Спробувати ще раз
            </button>
          </div>
        ) : null}
        {notices.data && notices.data.items.length === 0 ? (
          <p className="px-3 py-2 text-sm text-muted-foreground">Немає нових сповіщень.</p>
        ) : null}
        {notices.data?.items.map((item) => (
          <DropdownMenuItem key={item.id} asChild>
            <Link
              to={`/admin/bookings/${item.bookingId}`}
              className={item.unread ? 'bg-surface-muted/70 font-medium' : undefined}
              onClick={() => {
                void markRead.mutate(item.id)
              }}
            >
              <NoticeCopy item={item} />
            </Link>
          </DropdownMenuItem>
        ))}
        {unread > 0 ? (
          <DropdownMenuItem
            disabled={markAll.isPending}
            onSelect={(event) => {
              event.preventDefault()
              markAll.mutate()
            }}
          >
            Позначити всі як прочитані
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate('/admin/bookings')}>
          <span>
            <span className="block">Очікують підтвердження</span>
            <span className="text-xs text-muted-foreground">Відкрити список бронювань</span>
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate('/admin')}>
          <span>
            <span className="block">Заїзди сьогодні</span>
            <span className="text-xs text-muted-foreground">Відкрити головну</span>
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function NoticeCopy({ item }: { item: StaffNotice }) {
  return (
    <span className="block min-w-0 py-1">
      <span className="flex items-baseline justify-between gap-3">
        <span>{item.title}</span>
        <span className="shrink-0 text-xs font-normal text-muted-foreground">{noticeTimeLabel(item.createdAt)}</span>
      </span>
      <span className="mt-1 block text-xs font-normal text-muted-foreground">
        {adminBookingRef(item.bookingReference)}
        {item.guestName ? ` · ${item.guestName}` : ''} · {formatDate(item.checkIn)} — {formatDate(item.checkOut)} · гостей{' '}
        {item.guestCount}
      </span>
      <span className="mt-1 block text-xs font-normal text-muted-foreground">{bookingStatusLabel[item.bookingStatus]}</span>
    </span>
  )
}
