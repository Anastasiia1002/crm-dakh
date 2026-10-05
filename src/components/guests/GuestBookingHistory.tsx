import { useNavigate } from 'react-router-dom'
import { BookingStatusBadge } from '@/components/bookings/BookingStatusBadge'
import { EmptyState, SectionHeading } from '@/components/ui/states'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDateShort, formatGuests, formatMoney } from '@/lib/format'
import type { GuestBookingHistory as GuestBookingHistoryItem } from '@/types'

export function GuestBookingHistory({ history }: { history: GuestBookingHistoryItem[] }) {
  const navigate = useNavigate()

  return (
    <section>
      <SectionHeading title="Історія бронювань" />
      {history.length === 0 ? (
        <EmptyState>Бронювань поки немає.</EmptyState>
      ) : (
        <Table className="min-w-[760px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Бронювання</TableHead>
              <TableHead>Дати</TableHead>
              <TableHead>Розміщення</TableHead>
              <TableHead>Тариф</TableHead>
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
                aria-label={`Відкрити бронювання ${booking.number}`}
                onClick={() => navigate(`/admin/bookings/${booking.id}`)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    navigate(`/admin/bookings/${booking.id}`)
                  }
                }}
              >
                <TableCell className="font-medium">{booking.number}</TableCell>
                <TableCell>
                  {formatDateShort(booking.checkIn)}–{formatDateShort(booking.checkOut)}
                </TableCell>
                <TableCell>{booking.accommodationName}</TableCell>
                <TableCell>{booking.ratePlanName}</TableCell>
                <TableCell>{formatGuests(booking.adults, booking.children)}</TableCell>
                <TableCell>
                  <BookingStatusBadge status={booking.status} />
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatMoney(booking.totalAmount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  )
}
