import { useQuery } from '@tanstack/react-query'
import { listAdminBookings } from '@/api/admin-bookings'
import { getAdminCalendar } from '@/api/availability'
import { ApiError } from '@/lib/api-error'
import {
  OPERATION_MAX_PAGES,
  OPERATION_PAGE_LIMIT,
  movementWindow,
  timestampWindow,
  toOperationBooking,
  type OperationBooking,
} from '@/lib/operations-board'
import type { AdminBookingListQuery } from '@/types'

async function listOperationBookings(query: AdminBookingListQuery, signal: AbortSignal): Promise<OperationBooking[]> {
  const items: OperationBooking[] = []
  let page = 1
  while (page <= OPERATION_MAX_PAGES) {
    const result = await listAdminBookings({ ...query, page, limit: OPERATION_PAGE_LIMIT }, signal)
    items.push(...result.items.map(toOperationBooking))
    if (result.pagination.totalPages <= page || result.items.length === 0) return items
    page += 1
  }
  throw new ApiError(
    'За вибрану дату занадто багато бронювань. Відкрийте список бронювань.',
    0,
    'OPERATIONS_WINDOW_TOO_LARGE',
  )
}

export function useOperationsBoard(date: string) {
  const stay = movementWindow(date)
  const stamps = timestampWindow(date)
  const movements = useQuery({
    queryKey: ['admin-operations-board', 'movements', stay.checkIn, stay.checkOut],
    queryFn: ({ signal }) => listOperationBookings({ checkIn: stay.checkIn, checkOut: stay.checkOut }, signal),
    retry: false,
  })
  const created = useQuery({
    queryKey: ['admin-operations-board', 'created', stamps.from, stamps.to],
    queryFn: ({ signal }) => listOperationBookings({ createdFrom: stamps.from, createdTo: stamps.to }, signal),
    retry: false,
  })
  const cancelled = useQuery({
    queryKey: ['admin-operations-board', 'cancelled', stamps.from, stamps.to],
    queryFn: ({ signal }) =>
      listOperationBookings({ cancelledFrom: stamps.from, cancelledTo: stamps.to, status: 'CANCELLED' }, signal),
    retry: false,
  })
  const calendar = useQuery({
    queryKey: ['admin-operations-board', 'calendar', date],
    queryFn: ({ signal }) => getAdminCalendar({ from: date, to: stay.checkOut, active: true }, signal),
    retry: false,
  })
  return { movements, created, cancelled, calendar }
}
