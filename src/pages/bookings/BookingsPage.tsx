import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { BookingTable } from '@/components/bookings/BookingTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LoadingState } from '@/components/ui/states'
import { useBookings, useGuests } from '@/hooks/useBookings'
import { useAccommodations } from '@/hooks/useHotel'
import { bookingSourceLabel, bookingStatusLabel } from '@/lib/labels'
import type { BookingSource, BookingStatus } from '@/types'

export function BookingsPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<BookingStatus | 'all'>('all')
  const [accommodationId, setAccommodationId] = useState('all')
  const [source, setSource] = useState<BookingSource | 'all'>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const filters = useMemo(
    () => ({ search, status, accommodationId, source, dateFrom, dateTo }),
    [accommodationId, dateFrom, dateTo, search, source, status],
  )
  const bookings = useBookings(filters)
  const guests = useGuests()
  const accommodations = useAccommodations()

  const dirty = search || status !== 'all' || accommodationId !== 'all' || source !== 'all' || dateFrom || dateTo

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Пошук за номером, гостем, телефоном або email"
          className="lg:max-w-xl"
        />
        <Button asChild>
          <Link to="/admin/bookings/new">Нове бронювання</Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <span className="pb-2 text-[11px] tracking-[0.14em] text-muted uppercase">Фільтри</span>
        <Filter label="Дата від">
          <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="w-40" />
        </Filter>
        <Filter label="Дата до">
          <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="w-40" />
        </Filter>
        <Filter label="Статус">
          <Select value={status} onValueChange={(value) => setStatus(value as BookingStatus | 'all')}>
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
          <Select value={accommodationId} onValueChange={setAccommodationId}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Усі</SelectItem>
              {(accommodations.data ?? []).map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Filter>
        <Filter label="Джерело">
          <Select value={source} onValueChange={(value) => setSource(value as BookingSource | 'all')}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Усі джерела</SelectItem>
              {Object.entries(bookingSourceLabel).map(([value, label]) => (
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
            onClick={() => {
              setSearch('')
              setStatus('all')
              setAccommodationId('all')
              setSource('all')
              setDateFrom('')
              setDateTo('')
            }}
          >
            Очистити
          </button>
        ) : null}
      </div>

      {bookings.isLoading || guests.isLoading || accommodations.isLoading || !bookings.data || !guests.data || !accommodations.data ? (
        <LoadingState />
      ) : (
        <BookingTable
          variant="full"
          bookings={bookings.data}
          guests={guests.data}
          accommodations={accommodations.data}
          empty="Бронювань за цими умовами немає."
        />
      )}
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
