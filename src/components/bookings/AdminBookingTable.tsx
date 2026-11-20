import { Link, useNavigate } from 'react-router-dom'
import { BookingStatusBadge } from '@/components/bookings/BookingStatusBadge'
import { EmptyState } from '@/components/ui/states'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  MobileCard,
  MobileCardBadges,
  MobileCardDetail,
  MobileCardDetails,
  MobileCardHeader,
  MobileList,
  mobileCardControlClass,
} from '@/components/ui/mobile-list'
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

      <MobileList>
        {bookings.map((booking) => {
          const guestName = adminGuestName(booking.guest)
          return (
            <MobileCard key={booking.id}>
              <MobileCardHeader
                title={
                  guestReadable && booking.guest.id ? (
                    <Link to={`/admin/guests/${booking.guest.id}`} className={`${mobileCardControlClass} font-medium`}>
                      {guestName}
                    </Link>
                  ) : (
                    guestName
                  )
                }
              />
              <MobileCardBadges>
                <BookingStatusBadge status={booking.status} />
              </MobileCardBadges>
              <Link
                to={`/admin/bookings/${booking.id}`}
                className={`${mobileCardControlClass} mt-1.5 block no-underline hover:no-underline`}
              >
                <MobileCardDetails>
                  <MobileCardDetail label="Розміщення">{adminRoomsLabel(booking.rooms)}</MobileCardDetail>
                  <MobileCardDetail label="Дати">
                    <span className="tabular-nums">
                      {formatDate(booking.checkIn)} — {formatDate(booking.checkOut)}
                    </span>
                  </MobileCardDetail>
                  <MobileCardDetail label="Сума">
                    <span className="tabular-nums">{formatAdminBookingMoney(booking.totalAmount, booking.currency)}</span>
                  </MobileCardDetail>
                  <MobileCardDetail label="Бронювання">{adminBookingRef(booking.id)}</MobileCardDetail>
                  <MobileCardDetail label="Гості">{formatGuests(booking.adults, booking.children)}</MobileCardDetail>
                  {booking.guest.phone ? <MobileCardDetail label="Телефон">{booking.guest.phone}</MobileCardDetail> : null}
                  <MobileCardDetail label="Джерело">{adminBookingSourceLabel[booking.source]}</MobileCardDetail>
                </MobileCardDetails>
              </Link>
            </MobileCard>
          )
        })}
      </MobileList>
    </>
  )
}
