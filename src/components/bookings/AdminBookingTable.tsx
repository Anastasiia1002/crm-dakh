import { Link, useNavigate } from 'react-router-dom'
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
import { canReadGuests } from '@/lib/roles'
import { shouldOpenRow } from '@/lib/row-navigation'
import { cn } from '@/lib/utils'
import type { AdminBookingListItem, UserRole } from '@/types'

export function AdminBookingTable({
  bookings,
  empty,
  role,
}: {
  bookings: AdminBookingListItem[]
  empty: string
  role?: UserRole
}) {
  const navigate = useNavigate()
  const guestReadable = canReadGuests(role)
  if (bookings.length === 0) return <EmptyState>{empty}</EmptyState>

  function openBooking(bookingId: string) {
    navigate(`/admin/bookings/${bookingId}`)
  }

  return (
    <>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Гість</TableHead>
              <TableHead>Номер / будиночок</TableHead>
              <TableHead>Заїзд</TableHead>
              <TableHead>Виїзд</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead className="text-right">Сума</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.map((booking) => (
              <TableRow
                key={booking.id}
                className="cursor-pointer"
                onClick={(event) => {
                  if (shouldOpenRow(event)) openBooking(booking.id)
                }}
              >
                <TableCell>
                  {guestReadable && booking.guest.id ? (
                    <Link
                      to={`/admin/guests/${booking.guest.id}`}
                      className="font-medium hover:underline"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {adminGuestName(booking.guest)}
                    </Link>
                  ) : (
                    <span className="font-medium">{adminGuestName(booking.guest)}</span>
                  )}
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    <Link
                      to={`/admin/bookings/${booking.id}`}
                      className="hover:underline"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {adminBookingRef(booking.id)}
                    </Link>
                    {booking.guest.phone ? ` · ${booking.guest.phone}` : ''}
                  </div>
                </TableCell>
                <TableCell className="max-w-[14rem] truncate" title={adminRoomsLabel(booking.rooms)}>
                  {adminRoomsLabel(booking.rooms)}
                </TableCell>
                <TableCell className="tabular-nums whitespace-nowrap">{formatDate(booking.checkIn)}</TableCell>
                <TableCell className="tabular-nums whitespace-nowrap">{formatDate(booking.checkOut)}</TableCell>
                <TableCell>
                  <BookingStatusBadge status={booking.status} />
                </TableCell>
                <TableCell className="text-right tabular-nums whitespace-nowrap">
                  <div>{formatAdminBookingMoney(booking.totalAmount, booking.currency)}</div>
                  <div className="text-[11px] text-muted-foreground">{adminBookingSourceLabel[booking.source]}</div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="divide-y divide-border rounded-md border border-border bg-surface md:hidden">
        {bookings.map((booking) => (
          <li key={booking.id} className="px-4 py-3">
            <span className="flex items-start justify-between gap-3">
              <span className="min-w-0">
                {guestReadable && booking.guest.id ? (
                  <Link to={`/admin/guests/${booking.guest.id}`} className="block truncate font-medium hover:underline">
                    {adminGuestName(booking.guest)}
                  </Link>
                ) : (
                  <span className="block truncate font-medium">{adminGuestName(booking.guest)}</span>
                )}
                <Link
                  to={`/admin/bookings/${booking.id}`}
                  className={cn('mt-0.5 block truncate text-sm text-muted-foreground hover:underline')}
                >
                  {adminRoomsLabel(booking.rooms)}
                </Link>
              </span>
              <BookingStatusBadge status={booking.status} />
            </span>
            <Link to={`/admin/bookings/${booking.id}`} className="mt-2 block">
              <span className="flex items-baseline justify-between gap-3 text-sm">
                <span className="tabular-nums text-muted-foreground">
                  {formatDate(booking.checkIn)} — {formatDate(booking.checkOut)}
                </span>
                <span className="tabular-nums font-medium">
                  {formatAdminBookingMoney(booking.totalAmount, booking.currency)}
                </span>
              </span>
              <span className="mt-1 block text-[11px] text-muted-foreground">
                {adminBookingRef(booking.id)} · {formatGuests(booking.adults, booking.children)} ·{' '}
                {adminBookingSourceLabel[booking.source]}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
