import { useQuery } from '@tanstack/react-query'
import { useDeferredValue, useMemo, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { exportAdminBookingsCsv } from '@/api/admin-bookings'
import { listAllRoomTypes } from '@/api/accommodations'
import { AdminBookingTable } from '@/components/bookings/AdminBookingTable'
import { DateRangePicker } from '@/components/dates/DateRangePicker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import { Pagination } from '@/components/ui/pagination'
import { AccommodationSelectGroups } from '@/components/bookings/AccommodationSelectGroups'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageSkeleton } from '@/components/ui/page-status'
import { EmptyState } from '@/components/ui/states'
import { useAuth } from '@/hooks/useAuth'
import { useAdminBookings } from '@/hooks/useBookings'
import { useAllAdminRooms } from '@/hooks/useHotel'
import { ACCOMMODATION_FALLBACK_LABEL } from '@/lib/accommodation-labels'
import { adminBookingDateFilterReady, toAdminBookingListQuery } from '@/lib/admin-booking-view'
import { downloadBookingsCsv, downloadCsvBlob } from '@/lib/booking-export'
import { errorMessage } from '@/lib/errors'
import { adminBookingSourceLabel, bookingStatusLabel } from '@/lib/labels'
import { CATALOG_STALE_TIME } from '@/lib/queryClient'
import type { AdminBookingListFilters, AdminBookingSource, BookingStatus } from '@/types'

const PAGE_SIZE = 20

const STATUSES: BookingStatus[] = ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW']

function dateParam(value: string | null) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : ''
}

export function BookingsPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [status, setStatus] = useState<BookingStatus | 'all'>(() => {
    const value = searchParams.get('status')
    return value && STATUSES.includes(value as BookingStatus) ? (value as BookingStatus) : 'all'
  })
  const [roomId, setRoomId] = useState<string>(() => searchParams.get('roomId') || 'all')
  const [source, setSource] = useState<AdminBookingSource | 'all'>('all')
  const [checkIn, setCheckIn] = useState(() => dateParam(searchParams.get('checkIn')))
  const [checkOut, setCheckOut] = useState(() => dateParam(searchParams.get('checkOut')))
  const [createdLocalFrom] = useState(() => dateParam(searchParams.get('createdLocalFrom')))
  const [createdLocalTo] = useState(() => dateParam(searchParams.get('createdLocalTo')))
  const [cancelledFrom] = useState(() => dateParam(searchParams.get('cancelledFrom')))
  const [cancelledTo] = useState(() => dateParam(searchParams.get('cancelledTo')))
  const [page, setPage] = useState(1)
  const [exporting, setExporting] = useState(false)

  const dateGuard = adminBookingDateFilterReady(checkIn, checkOut)
  const filters: AdminBookingListFilters = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      search: deferredSearch,
      status,
      source,
      roomId,
      checkIn: dateGuard.ok ? checkIn : '',
      checkOut: dateGuard.ok ? checkOut : '',
      createdLocalFrom,
      createdLocalTo,
      cancelledFrom,
      cancelledTo,
    }),
    [cancelledFrom, cancelledTo, checkIn, checkOut, createdLocalFrom, createdLocalTo, dateGuard.ok, deferredSearch, page, roomId, source, status],
  )

  const bookings = useAdminBookings(filters, { enabled: dateGuard.ok || (!checkIn && !checkOut) })
  const rooms = useAllAdminRooms()
  const roomTypes = useQuery({
    queryKey: ['admin-room-types-all', { active: undefined }],
    queryFn: ({ signal }) => listAllRoomTypes({}, signal),
    staleTime: CATALOG_STALE_TIME,
  })

  const dirty =
    search || status !== 'all' || roomId !== 'all' || source !== 'all' || checkIn || checkOut || page !== 1

  function resetFilters() {
    setSearch('')
    setStatus('all')
    setRoomId('all')
    setSource('all')
    setCheckIn('')
    setCheckOut('')
    setPage(1)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Бронювання"
        description="Пошук і фільтри застосовуються до списку та повного експорту."
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              disabled={!bookings.data?.items.length}
              onClick={() => {
                const items = bookings.data?.items ?? []
                if (items.length === 0) {
                  toast.error('Немає рядків для експорту')
                  return
                }
                downloadBookingsCsv(items)
              }}
            >
              Експорт сторінки
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={exporting || (!dateGuard.ok && Boolean(checkIn || checkOut))}
              onClick={() => {
                const query = toAdminBookingListQuery({ ...filters, page: 1, limit: PAGE_SIZE })
                setExporting(true)
                void exportAdminBookingsCsv(query)
                  .then((blob) => {
                    downloadCsvBlob(blob, 'bronjuvannja.csv')
                  })
                  .catch((error) => toast.error(errorMessage(error)))
                  .finally(() => setExporting(false))
              }}
            >
              {exporting ? 'Експорт…' : 'Експортувати за фільтрами'}
            </Button>
            <Button asChild>
              <Link to="/admin/bookings/new">Нове бронювання</Link>
            </Button>
          </>
        }
      />

      <div className="filter-toolbar rounded-md border border-border bg-surface p-3">
        <label className="min-w-[12rem] flex-1 space-y-1.5">
          <span className="block text-[11px] tracking-[0.12em] text-muted uppercase">Пошук</span>
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
            placeholder="Гість, телефон або email"
            aria-label="Пошук за гостем, телефоном або email"
          />
        </label>
        <Filter label="Період">
          <DateRangePicker
            start={checkIn}
            end={checkOut}
            allowPast
            onChange={({ start, end }) => {
              setCheckIn(start)
              if (end) setCheckOut(end)
              setPage(1)
            }}
          />
        </Filter>
        <Filter label="Статус">
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value as BookingStatus | 'all')
              setPage(1)
            }}
          >
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Усі статуси</SelectItem>
              {Object.entries(bookingStatusLabel).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Filter>
        <Filter label="Номер / будиночок">
          <div className="space-y-1">
          <Select
            value={roomId}
            onValueChange={(value) => {
              setRoomId(value)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Усі</SelectItem>
              {roomId !== 'all' && !(rooms.data ?? []).some((item) => item.id === roomId) ? (
                <SelectItem value={roomId}>{ACCOMMODATION_FALLBACK_LABEL}</SelectItem>
              ) : null}
              <AccommodationSelectGroups rooms={rooms.data ?? []} roomTypes={roomTypes.data ?? []} />
            </SelectContent>
          </Select>
          {rooms.isError ? (
            <p className="max-w-52 text-xs text-destructive">Не вдалося завантажити повний список розміщень.</p>
          ) : null}
          </div>
        </Filter>
        <Filter label="Джерело">
          <Select
            value={source}
            onValueChange={(value) => {
              setSource(value as AdminBookingSource | 'all')
              setPage(1)
            }}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Усі джерела</SelectItem>
              {Object.entries(adminBookingSourceLabel).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Filter>
        {dirty ? (
          <Button type="button" variant="ghost" onClick={resetFilters}>
            Скинути фільтри
          </Button>
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground">
        «Експортувати за фільтрами» — усі рядки поточного фільтра. «Експорт сторінки» — лише ця сторінка.
      </p>

      {!dateGuard.ok && dateGuard.message ? (
        <p className="text-sm text-muted-foreground">{dateGuard.message}</p>
      ) : null}

      {bookings.isLoading && !bookings.data ? <PageSkeleton label="Завантажуємо бронювання…" /> : null}
      {bookings.isFetching && bookings.data ? (
        <p className="text-xs text-muted-foreground">Оновлення списку…</p>
      ) : null}

      {bookings.isError ? (
        <div className="space-y-3 border-t border-border py-10">
          <p className="text-sm">Не вдалося завантажити бронювання</p>
          <p className="text-sm text-muted-foreground">{errorMessage(bookings.error)}</p>
          <Button size="sm" variant="outline" onClick={() => void bookings.refetch()}>
            Спробувати ще раз
          </Button>
        </div>
      ) : null}

      {!bookings.isError && bookings.data ? (
        <>
          {bookings.data.items.length === 0 ? (
            <EmptyState>Бронювань за цими умовами немає.</EmptyState>
          ) : (
            <AdminBookingTable
              bookings={bookings.data.items}
              empty="Бронювань за цими умовами немає."
              role={user?.role}
            />
          )}
          <Pagination
            page={bookings.data.pagination.page}
            pageSize={bookings.data.pagination.limit}
            total={bookings.data.pagination.total}
            onPageChange={setPage}
          />
        </>
      ) : null}
    </div>
  )
}

function Filter({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-1.5">
      <span className="block text-[11px] tracking-[0.12em] text-muted uppercase">{label}</span>
      {children}
    </label>
  )
}
