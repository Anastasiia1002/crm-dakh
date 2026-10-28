import { useNavigate } from 'react-router-dom'
import { BookingStatusBadge } from '@/components/bookings/BookingStatusBadge'
import { EmptyState, SectionHeading } from '@/components/ui/states'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { guestStayRoomLabel, type AdminGuestHistoryItem } from '@/lib/admin-guests'
import { formatDateShort, formatGuests, formatMoneyAmount } from '@/lib/format'
import { adminBookingSourceLabel } from '@/lib/labels'

export function GuestBookingHistory({ history }: { history: AdminGuestHistoryItem[] }) {
  const navigate = useNavigate()

  return (
    <section>
      <SectionHeading title="Історія бронювань" />
      {history.length === 0 ? (
        <EmptyState>Бронювань поки немає.</EmptyState>
      ) : (
        <div className="overflow-x-auto">
          <Table className="min-w-[880px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Бронювання</TableHead>
                <TableHead>Дати</TableHead>
                <TableHead>Джерело</TableHead>
                <TableHead>Розміщення</TableHead>
                <TableHead>Гості</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="text-right">Сума</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((booking) => (
                <TableRow
                  key={booking.id}
                  tabIndex={0}
                  className="cursor-pointer"
                  aria-label={`Відкрити бронювання ${booking.id}`}
                  onClick={() => navigate(`/admin/bookings/${booking.id}`)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      navigate(`/admin/bookings/${booking.id}`)
                    }
                  }}
                >
                  <TableCell className="max-w-40 font-mono text-xs break-all">{booking.id}</TableCell>
                  <TableCell>
                    {formatDateShort(booking.checkIn)}–{formatDateShort(booking.checkOut)}
                  </TableCell>
                  <TableCell>{adminBookingSourceLabel[booking.source]}</TableCell>
                  <TableCell>{guestStayRoomLabel(booking.rooms)}</TableCell>
                  <TableCell>{formatGuests(booking.adults, booking.children)}</TableCell>
                  <TableCell>
                    <BookingStatusBadge status={booking.status} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {booking.currency === 'UAH' ? formatMoneyAmount(booking.totalAmount) : `${booking.totalAmount} ${booking.currency}`}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  )
}
