import { Link } from 'react-router-dom'
import { BookingStatusBadge } from '@/components/bookings/BookingStatusBadge'
import { EmptyState } from '@/components/ui/states'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate, formatGuests, formatMoney, guestCount } from '@/lib/format'
import type { Accommodation, Booking, Guest } from '@/types'

type Variant = 'full' | 'upcoming' | 'arrivals' | 'departures'

function findName(list: { id: string; name?: string; firstName?: string; lastName?: string }[], id: string) {
  return list.find((item) => item.id === id)
}

export function BookingTable({
  bookings,
  guests,
  accommodations,
  variant,
  empty,
}: {
  bookings: Booking[]
  guests: Guest[]
  accommodations: Accommodation[]
  variant: Variant
  empty: string
}) {
  if (bookings.length === 0) return <EmptyState>{empty}</EmptyState>

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          {variant === 'full' || variant === 'upcoming' ? <TableHead>№ бронювання</TableHead> : null}
          <TableHead>Гість</TableHead>
          <TableHead>Номер / будиночок</TableHead>
          {variant === 'arrivals' || variant === 'departures' ? <TableHead>Час</TableHead> : null}
          {variant === 'full' || variant === 'upcoming' ? (
            <>
              <TableHead>Заїзд</TableHead>
              <TableHead>Виїзд</TableHead>
            </>
          ) : null}
          {variant === 'full' ? <TableHead>Гості</TableHead> : null}
          {variant === 'arrivals' || variant === 'departures' ? <TableHead>Кількість гостей</TableHead> : null}
          <TableHead>Статус</TableHead>
          {variant === 'full' || variant === 'upcoming' ? <TableHead className="text-right">Сума</TableHead> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {bookings.map((booking) => {
          const guest = findName(guests, booking.guestId)
          const place = accommodations.find((item) => item.id === booking.accommodationId)
          const name = guest ? `${guest.firstName} ${guest.lastName}` : '—'
          return (
            <TableRow key={booking.id}>
              {variant === 'full' || variant === 'upcoming' ? (
                <TableCell>
                  <Link to={`/admin/bookings/${booking.id}`} className="font-medium hover:underline">
                    {booking.number}
                  </Link>
                </TableCell>
              ) : null}
              <TableCell>
                <Link to={`/admin/bookings/${booking.id}`} className="hover:underline">
                  {name}
                </Link>
              </TableCell>
              <TableCell>{place ? (place.name?.trim() || place.number) : '—'}</TableCell>
              {variant === 'arrivals' ? <TableCell>{booking.checkInTime}</TableCell> : null}
              {variant === 'departures' ? <TableCell>{booking.checkOutTime}</TableCell> : null}
              {variant === 'full' || variant === 'upcoming' ? (
                <>
                  <TableCell>{formatDate(booking.checkIn)}</TableCell>
                  <TableCell>{formatDate(booking.checkOut)}</TableCell>
                </>
              ) : null}
              {variant === 'full' ? <TableCell>{formatGuests(booking.adults, booking.children)}</TableCell> : null}
              {variant === 'arrivals' || variant === 'departures' ? (
                <TableCell>{guestCount(booking.adults, booking.children)}</TableCell>
              ) : null}
              <TableCell>
                <BookingStatusBadge status={booking.status} />
              </TableCell>
              {variant === 'full' || variant === 'upcoming' ? (
                <TableCell className="text-right tabular-nums">{formatMoney(booking.totalAmount)}</TableCell>
              ) : null}
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
