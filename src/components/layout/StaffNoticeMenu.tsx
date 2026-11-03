import { Bell, Check } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useMarkAllStaffNoticesRead, useMarkStaffNoticeRead, useStaffNotices } from '@/hooks/useStaffNotices'
import { adminBookingRef } from '@/lib/admin-booking-view'
import { errorMessage } from '@/lib/errors'
import { formatDate, formatGuests } from '@/lib/format'
import { bookingStatusLabel } from '@/lib/labels'
import { noticeTimeLabel } from '@/lib/notice-time'
import type { StaffNotice } from '@/types'

export function StaffNoticeMenu() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const notices = useStaffNotices()
  const markRead = useMarkStaffNoticeRead()
  const markAll = useMarkAllStaffNoticesRead()
  const pendingNoticeReads = useRef(new Set<string>())
  const unread = notices.data?.unreadCount ?? 0
  const label = unread > 0 ? `Сповіщення, непрочитаних: ${unread}` : 'Сповіщення'
  const listState = notices.isLoading
    ? ({ status: 'loading' } as const)
    : notices.isError
      ? ({ status: 'error' } as const)
      : ({ status: 'ready', items: (notices.data?.items ?? []).filter((item) => item.unread) } as const)
  const markOne = (id: string) => {
    if (pendingNoticeReads.current.has(id) || markAll.isPending) return
    pendingNoticeReads.current.add(id)
    markRead.mutate(id, {
      onError: (error) => toast.error(errorMessage(error)),
      onSettled: () => pendingNoticeReads.current.delete(id),
    })
  }

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
          pendingReadId={markRead.isPending ? markRead.variables : null}
          onOpen={(id) => {
            setOpen(false)
            markOne(id)
          }}
          onMarkRead={markOne}
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
  onMarkRead,
  pendingReadId,
  onPending,
  onToday,
}: {
  state: { status: 'loading' } | { status: 'error' } | { status: 'ready'; items: StaffNotice[] }
  unread: number
  markAllPending: boolean
  markAllError: string | null
  pendingReadId: string | null
  onRetry: () => void
  onMarkAll: () => void
  onOpen: (id: string) => void
  onMarkRead: (id: string) => void
  onPending: () => void
  onToday: () => void
}) {
  const showMarkAll = unread > 0 || markAllPending
  const visible = state.status === 'ready' ? state.items.filter((item) => item.unread) : []

  return (
    <div className="flex min-h-0 flex-col">
      <div data-notice-header className="shrink-0 space-y-2 border-b border-border px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">Сповіщення</p>
          {showMarkAll ? (
            <button
              type="button"
              data-mark-all
              className="max-w-[70%] bg-transparent p-0 text-right text-xs whitespace-normal text-muted-foreground underline-offset-2 shadow-none hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40"
              disabled={markAllPending}
              aria-busy={markAllPending || undefined}
              onClick={onMarkAll}
            >
              {markAllPending ? 'Позначаємо…' : 'Позначити всі як прочитані'}
            </button>
          ) : null}
        </div>
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
        {state.status === 'ready' && visible.length === 0 ? (
          <p className="px-3 py-2 text-sm text-muted-foreground">Немає непрочитаних сповіщень</p>
        ) : null}
        {state.status === 'ready'
          ? visible.map((item) => (
              <div key={item.id} className="flex items-start bg-secondary">
                <Link
                  to={`/admin/bookings/${item.bookingId}`}
                  data-notice-id={item.id}
                  data-unread="true"
                  className="block min-w-0 flex-1 rounded-sm px-3 py-2 font-medium outline-none hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-ring/50"
                  onClick={() => onOpen(item.id)}
                >
                  <NoticeCopy item={item} />
                </Link>
                <button
                  type="button"
                  data-mark-read={item.id}
                  className="mt-2 mr-2 grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40"
                  aria-label="Позначити як прочитане"
                  title="Позначити як прочитане"
                  disabled={pendingReadId === item.id}
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    onMarkRead(item.id)
                  }}
                >
                  <Check className="size-4" aria-hidden />
                </button>
              </div>
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

function noticeGuests(item: StaffNotice) {
  if (item.adults != null && item.children != null && item.adults + item.children === item.guestCount) {
    return formatGuests(item.adults, item.children)
  }
  return `гостей ${item.guestCount}`
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
        {item.guestName ? ` · ${item.guestName}` : ''} · {formatDate(item.checkIn)} — {formatDate(item.checkOut)} ·{' '}
        {noticeGuests(item)}
      </span>
      <span className="mt-1 block text-xs font-normal text-muted-foreground">{bookingStatusLabel[item.bookingStatus]}</span>
    </span>
  )
}
