import { Badge } from '@/components/ui/badge'
import { bookingStatusLabel } from '@/lib/labels'
import type { BookingStatus } from '@/types'

const tone: Record<BookingStatus, 'pending' | 'confirmed' | 'checkedIn' | 'checkedOut' | 'cancelled' | 'noShow'> = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CHECKED_IN: 'checkedIn',
  CHECKED_OUT: 'checkedOut',
  CANCELLED: 'cancelled',
  NO_SHOW: 'noShow',
}

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return <Badge tone={tone[status]}>{bookingStatusLabel[status]}</Badge>
}
