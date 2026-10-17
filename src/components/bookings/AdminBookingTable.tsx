import { Link } from 'react-router-dom'
import { BookingStatusBadge } from '@/components/bookings/BookingStatusBadge'
import { EmptyState } from '@/components/ui/states'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  adminBookingRef,
  adminGuestName,
  adminRoomsLabel,
  formatAdminBookingMoney,
} from '@/lib/admin-booking-view'
import { formatDate, formatGuests } from '@/lib/format'
import { adminBookingSourceLabel } from '@/lib/labels'
import type { AdminBookingListItem } from '@/types'

export function AdminBookingTable({
  bookings,
  empty,
}: {
  bookings: AdminBookingListItem[]
  empty: string
}) {
  if (bookings.length === 0) return <EmptyState>{empty}</EmptyState>

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>ID</TableHead>
          <TableHead>Гість</TableHead>
          <TableHead>Номер / будиночок</TableHead>
          <TableHead>Заїзд</TableHead>
          <TableHead>Виїзд</TableHead>
          <TableHead>Гості</TableHead>
          <TableHead>Статус</TableHead>
          <TableHead>Джерело</TableHead>
          <TableHead className="text-right">Сума</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {bookings.map((booking) => (
          <TableRow key={booking.id}>
            <TableCell>
              <Link to={`/admin/bookings/${booking.id}`} className="font-medium hover:underline" title={booking.id}>
                {adminBookingRef(booking.id)}
              </Link>
            </TableCell>
            <TableCell>
              <Link to={`/admin/bookings/${booking.id}`} className="hover:underline">
                {adminGuestName(booking.guest)}
              </Link>
              {booking.guest.phone ? (
                <div className="text-[11px] text-muted-foreground">{booking.guest.phone}</div>
              ) : null}
            </TableCell>
            <TableCell>{adminRoomsLabel(booking.rooms)}</TableCell>
            <TableCell>{formatDate(booking.checkIn)}</TableCell>
            <TableCell>{formatDate(booking.checkOut)}</TableCell>
            <TableCell>{formatGuests(booking.adults, booking.children)}</TableCell>
            <TableCell>
              <BookingStatusBadge status={booking.status} />
            </TableCell>
            <TableCell>{adminBookingSourceLabel[booking.source]}</TableCell>
            <TableCell className="text-right tabular-nums">
              {formatAdminBookingMoney(booking.totalAmount, booking.currency)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
