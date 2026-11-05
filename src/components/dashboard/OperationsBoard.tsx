import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Ban,
  BedDouble,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LogIn,
  LogOut,
  NotebookPen,
  Plus,
  Search,
} from 'lucide-react'
import { BookingStatusBadge } from '@/components/bookings/BookingStatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { QueryErrorState } from '@/components/ui/page-status'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useOperationsBoard } from '@/hooks/useOperationsBoard'
import { adminBookingRef } from '@/lib/admin-booking-view'
import { addCalendarDays, todayIso } from '@/lib/dates'
import { formatCount, formatDate } from '@/lib/format'
import { occupancyPercentLabel } from '@/lib/dashboard-summary'
import { ApiError } from '@/lib/api-error'
import {
  attentionBookings,
  bookingsOnHotelDate,
  matchesOperationSearch,
  occupancyForNight,
  sortOperationBookings,
  splitStayOperations,
  type OperationBooking,
  type OperationSortKey,
  type OperationTab,
} from '@/lib/operations-board'

const TABS: Array<{
  id: OperationTab
  label: string
  hint: string
  icon: typeof BedDouble
}> = [
  { id: 'inHouse', label: 'Проживають', hint: 'Бронювання, що займають цю ніч', icon: BedDouble },
  { id: 'arrivals', label: 'Заїзди', hint: 'Заплановані заїзди на вибрану дату', icon: LogIn },
  { id: 'departures', label: 'Виїзди', hint: 'Заплановані виїзди на вибрану дату', icon: LogOut },
  { id: 'created', label: 'Нові', hint: 'Створені цього дня за часом готелю', icon: Plus },
  { id: 'cancelled', label: 'Скасовані', hint: 'Скасовані цього дня за часом готелю', icon: Ban },
]

const PAGE_SIZE = 8

export function OperationsBoard({
  date,
  timeZone,
  onDate,
}: {
  date: string
  timeZone: string
  onDate: (date: string) => void
}) {
  const navigate = useNavigate()
  const board = useOperationsBoard(date)
  const [tab, setTab] = useState<OperationTab>('inHouse')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<OperationSortKey>('checkIn')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)
  const stay = board.movements.data?.items ?? []
  const split = useMemo(() => splitStayOperations(stay, date), [stay, date])
  const created = useMemo(() => {
    const items = board.created.data?.items ?? []
    if (board.created.data?.hotelLocal) return items
    return bookingsOnHotelDate(items, date, timeZone, 'createdAt')
  }, [board.created.data, date, timeZone])
  const cancelledUnsupported = isRejectedQuery(board.cancelled.error)
  const cancelled = useMemo(
    () => (cancelledUnsupported ? [] : (board.cancelled.data?.items ?? [])),
    [board.cancelled.data, cancelledUnsupported],
  )
  const counts: Record<OperationTab, { value: number | null; complete: boolean }> = {
    inHouse: listedCount(board.movements, split.inHouse.length),
    arrivals: listedCount(board.movements, split.arrivals.length),
    departures: listedCount(board.movements, split.departures.length),
    created: listedCount(board.created, created.length),
    cancelled: listedCount(board.cancelled, cancelled.length),
  }
  const rowsForTab: Record<OperationTab, OperationBooking[]> = {
    inHouse: split.inHouse,
    arrivals: split.arrivals,
    departures: split.departures,
    created,
    cancelled,
  }
  const filtered = sortOperationBookings(
    rowsForTab[tab].filter((booking) => matchesOperationSearch(booking, search)),
    sortKey,
    sortDirection,
  )
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const occupancy = board.calendar.data ? occupancyForNight(board.calendar.data, date) : null
  const attention = attentionBookings(split.inHouse, split.arrivals)
  const activeQuery = queryForTab(tab, board)
  const loading = activeQuery.isPending
  const incomplete = Boolean(activeQuery.data && !activeQuery.data.complete) && !(tab === 'cancelled' && cancelledUnsupported)

  function chooseTab(next: OperationTab) {
    setTab(next)
    setPage(1)
  }

  function toggleSort(key: OperationSortKey) {
    setPage(1)
    if (sortKey === key) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(key)
    setSortDirection('asc')
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Операційна дата {formatDate(date)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Часовий пояс готелю: {timeZone}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" aria-label="Попередній день" onClick={() => onDate(addCalendarDays(date, -1))}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button type="button" variant="outline" onClick={() => onDate(addCalendarDays(date, 1))} aria-label="Наступний день">
            <ChevronRight className="size-4" />
          </Button>
          <Button type="button" variant="outline" onClick={() => onDate(todayIso(new Date(), timeZone))}>
            Сьогодні
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={board.movements.isFetching || board.calendar.isFetching}
            aria-busy={board.movements.isFetching || board.calendar.isFetching || undefined}
            onClick={() => {
              void board.movements.refetch()
              void board.created.refetch()
              void board.cancelled.refetch()
              void board.calendar.refetch()
            }}
          >
            Оновити
          </Button>
          <Button type="button" asChild>
            <Link to="/admin/bookings/new">Нове бронювання</Link>
          </Button>
        </div>
      </div>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        {TABS.map((item) => {
          const Icon = item.icon
          const count = counts[item.id]
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={tab === item.id}
              onClick={() => chooseTab(item.id)}
              className={`rounded-md border px-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
                tab === item.id ? 'border-foreground bg-surface' : 'border-border bg-surface hover:border-foreground/30'
              }`}
            >
              <span className="flex items-center justify-between gap-2 text-[11px] tracking-[0.12em] text-muted uppercase">
                {item.label}
                <Icon className="size-3.5" aria-hidden />
              </span>
              <span className="mt-2 block font-serif text-3xl leading-none tabular-nums">
                {count.value === null ? '—' : count.complete ? formatCount(count.value) : `${formatCount(count.value)}+`}
              </span>
              <span className="mt-2 block text-xs text-muted-foreground">{item.hint}</span>
            </button>
          )
        })}
      </section>

      <section className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <OccupancyPanel
          date={date}
          loading={board.calendar.isPending}
          error={board.calendar.error}
          onRetry={() => void board.calendar.refetch()}
          occupancy={occupancy}
        />
        <AttentionPanel items={attention} loading={board.movements.isPending} error={board.movements.isError} />
      </section>

      <section className="rounded-md border border-border bg-surface">
        <Tabs value={tab} onValueChange={(value) => chooseTab(value as OperationTab)}>
          <div className="flex flex-col gap-3 border-b border-border px-4 py-3">
            <TabsList className="flex-wrap gap-x-4 gap-y-1 overflow-x-auto" aria-label="Списки бронювань за день">
              {TABS.map((item) => {
                const count = counts[item.id]
                const label =
                  count.value === null ? item.label : `${item.label} ${count.complete ? formatCount(count.value) : `${formatCount(count.value)}+`}`
                return (
                  <TabsTrigger key={item.id} value={item.id} className="whitespace-nowrap">
                    {label}
                  </TabsTrigger>
                )
              })}
            </TabsList>
            <label className="relative block sm:w-72 sm:self-end">
              <span className="sr-only">Пошук гостя або номера бронювання</span>
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(1)
                }}
                placeholder="Гість або номер бронювання"
                className="bg-background pl-8"
              />
            </label>
          </div>
        </Tabs>
        {incomplete ? (
          <p className="border-b border-border px-4 py-3 text-sm text-muted-foreground">
            Список ще не повний. Лічильник і пошук можуть бути неповні.{' '}
            <Link to="/admin/bookings" className="underline-offset-4 hover:underline">
              Відкрити список бронювань
            </Link>
          </p>
        ) : null}
        {loading ? <BoardSkeleton /> : null}
        {activeQuery.isError && !(tab === 'cancelled' && cancelledUnsupported) ? (
          <div className="px-4">
            <QueryErrorState error={activeQuery.error} title="Не вдалося завантажити дані." onRetry={() => void activeQuery.refetch()} />
          </div>
        ) : null}
        {tab === 'cancelled' && cancelledUnsupported ? (
          <p className="px-4 py-8 text-sm text-muted-foreground">
            Список бронювань ще не віддає час скасування. Після оновлення сервера тут будуть скасовані цього дня.
          </p>
        ) : null}
        {!loading && !activeQuery.isError && visible.length === 0 && !incomplete && !(tab === 'cancelled' && cancelledUnsupported) ? (
          <p className="px-4 py-8 text-sm text-muted-foreground">За вибрану дату нічого немає.</p>
        ) : null}
        {!loading && !activeQuery.isError && visible.length > 0 ? (
          <>
            <div className="hidden md:block">
              <table className="w-full text-sm">
                <thead className="text-left text-[11px] tracking-[0.12em] text-muted uppercase">
                  <tr>
                    <SortHeader label="Гість" active={sortKey === 'guest'} onClick={() => toggleSort('guest')} />
                    <SortHeader label="Проживання" active={sortKey === 'accommodation'} onClick={() => toggleSort('accommodation')} />
                    <SortHeader label="Заїзд" active={sortKey === 'checkIn'} onClick={() => toggleSort('checkIn')} />
                    <SortHeader label="Виїзд" active={sortKey === 'checkOut'} onClick={() => toggleSort('checkOut')} />
                    <SortHeader label="Статус" active={sortKey === 'status'} onClick={() => toggleSort('status')} />
                    <SortHeader label="Номер бронювання" active={sortKey === 'reference'} onClick={() => toggleSort('reference')} />
                    <th className="px-4 py-2 font-medium">Дія</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((booking) => (
                    <tr
                      key={booking.id}
                      className="cursor-pointer border-t border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                      tabIndex={0}
                      onClick={() => navigate(`/admin/bookings/${booking.id}`)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          navigate(`/admin/bookings/${booking.id}`)
                        }
                      }}
                    >
                      <td className="px-4 py-3">{booking.guestName}</td>
                      <td className="px-4 py-3">{booking.accommodation}</td>
                      <td className="px-4 py-3 tabular-nums">{formatDate(booking.checkIn)}</td>
                      <td className="px-4 py-3 tabular-nums">{formatDate(booking.checkOut)}</td>
                      <td className="px-4 py-3">
                        <BookingStatusBadge status={booking.status} />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{adminBookingRef(booking.id)}</td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/admin/bookings/${booking.id}`}
                          className="underline-offset-4 hover:underline"
                          onClick={(event) => event.stopPropagation()}
                        >
                          Відкрити
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-border md:hidden">
              {visible.map((booking) => (
                <li key={booking.id}>
                  <Link to={`/admin/bookings/${booking.id}`} className="block px-4 py-3">
                    <span className="flex items-start justify-between gap-3">
                      <span>
                        <span className="block font-medium">{booking.guestName}</span>
                        <span className="mt-1 block text-sm text-muted-foreground">{booking.accommodation}</span>
                      </span>
                      <BookingStatusBadge status={booking.status} />
                    </span>
                    <span className="mt-2 block text-sm tabular-nums text-muted-foreground">
                      {formatDate(booking.checkIn)} — {formatDate(booking.checkOut)} · {adminBookingRef(booking.id)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {pageCount > 1 ? (
              <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
                <span className="text-muted-foreground">
                  {safePage} / {pageCount}
                </span>
                <span className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
                    Назад
                  </Button>
                  <Button type="button" size="sm" variant="outline" disabled={safePage >= pageCount} onClick={() => setPage(safePage + 1)}>
                    Далі
                  </Button>
                </span>
              </div>
            ) : null}
          </>
        ) : null}
      </section>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <QuickLink to="/admin/bookings/new" icon={Plus} label="Нове бронювання" />
        <QuickLink to="/admin/calendar" icon={CalendarDays} label="Шахматка" />
        <QuickLink to="/admin/bookings" icon={NotebookPen} label="Бронювання" />
        <QuickLink to="/admin/accommodations" icon={Building2} label="Номери та будиночки" />
      </section>
    </div>
  )
}

function OccupancyPanel({
  date,
  loading,
  error,
  onRetry,
  occupancy,
}: {
  date: string
  loading: boolean
  error: unknown
  onRetry: () => void
  occupancy: ReturnType<typeof occupancyForNight> | null
}) {
  const width = occupancy?.percent ? Math.min(100, Number(occupancy.percent)) : 0
  return (
    <div className="rounded-md border border-border bg-surface px-4 py-4">
      <h3 className="font-serif text-xl">Завантаженість</h3>
      <p className="mt-1 text-sm text-muted-foreground">Знімок на {formatDate(date)}, не підсумок за період.</p>
      {loading ? <div className="mt-4 h-16 animate-pulse rounded-md bg-surface-muted" aria-busy="true" /> : null}
      {error ? <QueryErrorState error={error} title="Не вдалося завантажити дані." onRetry={onRetry} /> : null}
      {occupancy ? (
        <div className="mt-4 grid grid-cols-3 gap-3">
          <Metric label="Зайняті" value={formatCount(occupancy.occupied)} />
          <Metric label="Вільні" value={formatCount(occupancy.available)} />
          <Metric label="Заблоковані" value={formatCount(occupancy.blocked)} />
          <div className="col-span-3">
            <div className="mb-1 flex items-baseline justify-between">
              <span className="text-xs text-muted-foreground">Продавані місця</span>
              <span className="font-serif text-2xl tabular-nums">
                {occupancy.percent === null ? '—' : occupancyPercentLabel(occupancy.percent)}
              </span>
            </div>
            <div
              className="h-1.5 overflow-hidden rounded-full bg-surface-muted"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(width)}
              aria-label="Завантаженість продаваних місць"
            >
              <div className="h-full bg-success" style={{ width: `${width}%` }} />
            </div>
            {occupancy.percent === null ? (
              <p className="mt-2 text-xs text-muted-foreground">Немає продаваних місць.</p>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                {formatCount(occupancy.occupied)} / {formatCount(occupancy.sellable)}. Заблоковані та виведені з продажу не входять у відсоток.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function AttentionPanel({
  items,
  loading,
  error,
}: {
  items: OperationBooking[]
  loading: boolean
  error: boolean
}) {
  return (
    <div className="rounded-md border border-border bg-surface px-4 py-4">
      <h3 className="font-serif text-xl">Потребують дії</h3>
      <p className="mt-1 text-sm text-muted-foreground">Бронювання зі статусом «Очікує підтвердження».</p>
      {loading ? <div className="mt-4 h-16 animate-pulse rounded-md bg-surface-muted" /> : null}
      {!loading && error ? <p className="mt-4 text-sm text-muted-foreground">Список заїздів не завантажився.</p> : null}
      {!loading && !error && items.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Немає бронювань, що потребують підтвердження.</p>
      ) : null}
      {!loading && !error && items.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {items.slice(0, 4).map((booking) => (
            <li key={booking.id}>
              <Link to={`/admin/bookings/${booking.id}`} className="block text-sm underline-offset-4 hover:underline">
                {booking.guestName}
                <span className="text-muted-foreground"> · {formatDate(booking.checkIn)}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function QuickLink({ to, icon: Icon, label }: { to: string; icon: typeof Plus; label: string }) {
  return (
    <Button type="button" variant="outline" asChild className="justify-start">
      <Link to={to}>
        <Icon className="size-4" />
        {label}
      </Link>
    </Button>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-serif text-2xl tabular-nums">{value}</p>
    </div>
  )
}

function SortHeader({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <th className="px-4 py-2 font-medium">
      <button type="button" className={active ? 'text-foreground' : undefined} onClick={onClick}>
        {label}
      </button>
    </th>
  )
}

function BoardSkeleton() {
  return (
    <div className="space-y-2 px-4 py-4" aria-busy="true" aria-live="polite">
      <p className="sr-only">Завантажуємо зведення…</p>
      <div className="h-10 animate-pulse rounded-md bg-surface-muted" />
      <div className="h-10 animate-pulse rounded-md bg-surface-muted" />
    </div>
  )
}

function isRejectedQuery(error: unknown) {
  return error instanceof ApiError && error.status === 400
}

function listedCount(
  query: { isPending: boolean; isError: boolean; data?: { complete: boolean } },
  length: number,
): { value: number | null; complete: boolean } {
  if (query.isPending || query.isError || !query.data) return { value: null, complete: true }
  return { value: length, complete: query.data.complete }
}

function queryForTab(
  tab: OperationTab,
  board: ReturnType<typeof useOperationsBoard>,
) {
  if (tab === 'created') return board.created
  if (tab === 'cancelled') return board.cancelled
  return board.movements
}
