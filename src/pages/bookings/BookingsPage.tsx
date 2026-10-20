import { useDeferredValue, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AdminBookingTable } from '@/components/bookings/AdminBookingTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState, LoadingState } from '@/components/ui/states'
import { useAdminBookings } from '@/hooks/useBookings'
import { useAdminRooms } from '@/hooks/useHotel'
import { adminBookingDateFilterReady } from '@/lib/admin-booking-view'
import { roomDisplayName } from '@/lib/dates'
import { errorMessage } from '@/lib/errors'
import { adminBookingSourceLabel, bookingStatusLabel } from '@/lib/labels'
import type { AdminBookingListFilters, AdminBookingSource, BookingStatus } from '@/types'

const PAGE_SIZE = 20

export function BookingsPage() {
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [status, setStatus] = useState<BookingStatus | 'all'>('all')
  const [roomId, setRoomId] = useState<string>('all')
  const [source, setSource] = useState<AdminBookingSource | 'all'>('all')
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [page, setPage] = useState(1)

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
    }),
    [checkIn, checkOut, dateGuard.ok, deferredSearch, page, roomId, source, status],
  )

  const bookings = useAdminBookings(filters, { enabled: dateGuard.ok || (!checkIn && !checkOut) })
  const rooms = useAdminRooms({ page: 1, limit: 100 })

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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <Input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setPage(1)
          }}
          placeholder="Пошук за гостем, телефоном або email"
          className="lg:max-w-xl"
        />
        <Button asChild>
          <Link to="/admin/bookings/new">Нове бронювання</Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <span className="pb-2 text-[11px] tracking-[0.14em] text-muted uppercase">Фільтри</span>
        <Filter label="Період від">
          <Input
            type="date"
            value={checkIn}
            onChange={(event) => {
              setCheckIn(event.target.value)
              setPage(1)
            }}
            className="w-40"
          />
        </Filter>
        <Filter label="Період до">
          <Input
            type="date"
            value={checkOut}
            onChange={(event) => {
              setCheckOut(event.target.value)
              setPage(1)
            }}
            className="w-40"
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
              {(rooms.data?.items ?? []).map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {roomDisplayName(item)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          <button
            type="button"
            className="h-10 text-sm text-muted-foreground underline-offset-4 hover:underline"
            onClick={resetFilters}
          >
            Очистити
          </button>
        ) : null}
      </div>

      {!dateGuard.ok && dateGuard.message ? (
        <p className="text-sm text-muted-foreground">{dateGuard.message}</p>
      ) : null}

      {bookings.isLoading && !bookings.data ? <LoadingState /> : null}
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
            <AdminBookingTable bookings={bookings.data.items} empty="Бронювань за цими умовами немає." />
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
