import { Bell } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useMarkAllStaffNoticesRead, useMarkStaffNoticeRead, useStaffNotices } from '@/hooks/useStaffNotices'
import { adminBookingRef } from '@/lib/admin-booking-view'
import { errorMessage } from '@/lib/errors'
import { formatDate } from '@/lib/format'
import { bookingStatusLabel } from '@/lib/labels'
import { noticeTimeLabel } from '@/lib/notice-time'
import type { StaffNotice } from '@/types'

export function StaffNoticeMenu() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const notices = useStaffNotices()
  const markRead = useMarkStaffNoticeRead()
  const markAll = useMarkAllStaffNoticesRead()
  const unread = notices.data?.unreadCount ?? 0
  const label = unread > 0 ? `Сповіщення, непрочитаних: ${unread}` : 'Сповіщення'
  const listState = notices.isLoading
    ? ({ status: 'loading' } as const)
    : notices.isError
      ? ({ status: 'error' } as const)
      : ({ status: 'ready', items: notices.data?.items ?? [] } as const)

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        className="relative rounded-md p-2 text-foreground outline-none hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-ring/50"
        aria-label={label}
      >
        <Bell className="size-[18px]" strokeWidth={1.5} />
        {unread > 0 ? (
          <span className="absolute top-1 right-1 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] leading-4 text-primary-foreground">
            {unread > 99 ? '99+' : unread}
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="flex w-[min(20rem,calc(100vw-1.5rem))] max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden p-0"
      >
        <StaffNoticePanel
          state={listState}
          unread={unread}
          markAllPending={markAll.isPending}
          markAllError={markAll.isError ? errorMessage(markAll.error) : null}
          onRetry={() => void notices.refetch()}
          onMarkAll={() => {
            if (unread === 0 || markAll.isPending) return
            markAll.mutate()
          }}
          onOpen={(id) => {
            setOpen(false)
            void markRead.mutate(id)
          }}
          onPending={() => {
            setOpen(false)
            navigate('/admin/bookings')
          }}
          onToday={() => {
            setOpen(false)
            navigate('/admin')
          }}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function StaffNoticePanel({
  state,
  unread,
  markAllPending,
  markAllError,
  onRetry,
  onMarkAll,
  onOpen,
  onPending,
  onToday,
}: {
  state: { status: 'loading' } | { status: 'error' } | { status: 'ready'; items: StaffNotice[] }
  unread: number
  markAllPending: boolean
  markAllError: string | null
  onRetry: () => void
  onMarkAll: () => void
  onOpen: (id: string) => void
  onPending: () => void
  onToday: () => void
}) {
  const markAllDisabled = unread === 0 || markAllPending

  return (
    <div className="flex min-h-0 flex-col">
      <div data-notice-header className="shrink-0 space-y-2 border-b border-border px-3 py-2">
        <p className="text-xs text-muted-foreground">Сповіщення</p>
        <button
          type="button"
          data-mark-all
          className="min-h-11 w-full rounded-md border border-border bg-surface px-3 py-2 text-left text-sm whitespace-normal hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40"
          disabled={markAllDisabled}
          aria-busy={markAllPending || undefined}
          onClick={onMarkAll}
        >
          {markAllPending ? 'Позначаємо…' : 'Позначити всі як прочитані'}
        </button>
        {markAllError ? (
          <p role="alert" className="text-xs text-destructive">
            {markAllError}
          </p>
        ) : null}
      </div>

      <div
        data-notice-scroll
        className="min-h-0 max-h-[min(440px,calc(100dvh-160px))] overflow-y-auto overscroll-contain"
      >
        {state.status === 'loading' ? <p className="px-3 py-2 text-sm text-muted-foreground">Завантажуємо сповіщення…</p> : null}
        {state.status === 'error' ? (
          <div className="space-y-2 px-3 py-2" role="alert">
            <p className="text-sm">Не вдалося завантажити сповіщення.</p>
            <button type="button" className="text-sm underline" onClick={onRetry}>
              Спробувати ще раз
            </button>
          </div>
        ) : null}
        {state.status === 'ready' && state.items.length === 0 ? (
          <p className="px-3 py-2 text-sm text-muted-foreground">Немає нових сповіщень.</p>
        ) : null}
        {state.status === 'ready'
          ? state.items.map((item) => (
              <Link
                key={item.id}
                to={`/admin/bookings/${item.bookingId}`}
                data-notice-id={item.id}
                data-unread={item.unread ? 'true' : 'false'}
                className={`block rounded-sm px-3 py-2 outline-none hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-ring/50 ${item.unread ? 'bg-secondary font-medium' : 'bg-surface'}`}
                onClick={() => onOpen(item.id)}
              >
                <NoticeCopy item={item} />
              </Link>
            ))
          : null}
      </div>

      <div data-notice-footer className="shrink-0 border-t border-border p-1">
        <button
          type="button"
          className="block w-full rounded-sm px-3 py-2 text-left outline-none hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-ring/50"
          onClick={onPending}
        >
          <span className="block">Очікують підтвердження</span>
          <span className="text-xs text-muted-foreground">Відкрити список бронювань</span>
        </button>
        <button
          type="button"
          className="block w-full rounded-sm px-3 py-2 text-left outline-none hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-ring/50"
          onClick={onToday}
        >
          <span className="block">Заїзди сьогодні</span>
          <span className="text-xs text-muted-foreground">Відкрити головну</span>
        </button>
      </div>
    </div>
  )
}

function NoticeCopy({ item }: { item: StaffNotice }) {
  return (
    <span className="block min-w-0 py-1 break-words">
      <span className="flex items-baseline justify-between gap-3">
        <span className="min-w-0">{item.title}</span>
        <span className="shrink-0 text-xs font-normal text-muted-foreground">{noticeTimeLabel(item.createdAt)}</span>
      </span>
      <span className="mt-1 block text-xs font-normal break-words text-muted-foreground">
        {adminBookingRef(item.bookingReference)}
        {item.guestName ? ` · ${item.guestName}` : ''} · {formatDate(item.checkIn)} — {formatDate(item.checkOut)} · гостей{' '}
        {item.guestCount}
      </span>
      <span className="mt-1 block text-xs font-normal text-muted-foreground">{bookingStatusLabel[item.bookingStatus]}</span>
    </span>
  )
}
