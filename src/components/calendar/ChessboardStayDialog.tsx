import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { adminBookingRef, adminGuestName } from '@/lib/admin-booking-view'
import { formatDate } from '@/lib/format'
import { bookingStatusLabel } from '@/lib/labels'
import type { AdminBookingListItem } from '@/types'

export type ChessboardStayPeek = {
  bookingId: string
  label: string
  roomLabel: string
  startDate: string
  endDate: string
  metadataMissing?: boolean
}

export function ChessboardStayDialog({
  open,
  peek,
  booking,
  onOpenChange,
}: {
  open: boolean
  peek: ChessboardStayPeek | null
  booking: AdminBookingListItem | null
  onOpenChange: (open: boolean) => void
}) {
  const guest = booking ? adminGuestName(booking.guest) : peek?.label || '—'
  const dates = booking
    ? `${formatDate(booking.checkIn)} — ${formatDate(booking.checkOut)}`
    : peek
      ? `${formatDate(peek.startDate)} — ${formatDate(peek.endDate)}`
      : ''
  const status = booking
    ? bookingStatusLabel[booking.status]
    : peek?.metadataMissing
      ? 'Зайнято (деталі не завантажено)'
      : 'Зайнято'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Бронювання</DialogTitle>
          <DialogDescription>
            {peek?.roomLabel ?? 'Розміщення'}
            {booking && booking.id.length > 8 ? ` · ${adminBookingRef(booking.id)}` : ''}
          </DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-1 gap-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Гість</dt>
            <dd>{guest}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Розміщення</dt>
            <dd>{peek?.roomLabel ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Дати</dt>
            <dd>{dates || '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Статус</dt>
            <dd>{status}</dd>
          </div>
        </dl>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Закрити
          </Button>
          {peek?.bookingId ? (
            <Button type="button" asChild>
              <Link to={`/admin/bookings/${peek.bookingId}`}>Відкрити бронювання</Link>
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
