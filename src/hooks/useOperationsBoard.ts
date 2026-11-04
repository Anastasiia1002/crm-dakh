import { useQuery } from '@tanstack/react-query'
import { listAdminBookings } from '@/api/admin-bookings'
import { getAdminCalendar } from '@/api/availability'
import { ApiError } from '@/lib/api-error'
import { addCalendarDays } from '@/lib/dates'
import {
  OPERATION_PAGE_LIMIT,
  movementWindow,
  operationPageDecision,
  timestampWindow,
  toOperationBooking,
  type OperationBooking,
} from '@/lib/operations-board'
import type { AdminBookingListQuery } from '@/types'

export type OperationList = {
  items: OperationBooking[]
  complete: boolean
}

async function listOperationBookings(query: AdminBookingListQuery, signal: AbortSignal): Promise<OperationList> {
  const items: OperationBooking[] = []
  let page = 1
  while (true) {
    const result = await listAdminBookings({ ...query, page, limit: OPERATION_PAGE_LIMIT }, signal)
    items.push(...result.items.map(toOperationBooking))
    const decision = operationPageDecision(page, result.pagination.totalPages, result.items.length)
    if (decision === 'done') return { items, complete: true }
    if (decision === 'truncated') return { items, complete: false }
    page += 1
  }
}

async function listCreatedOnHotelDate(date: string, signal: AbortSignal): Promise<OperationList> {
  try {
    return await listOperationBookings(
      { createdLocalFrom: date, createdLocalTo: addCalendarDays(date, 1) },
      signal,
    )
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 400) throw error
    const stamps = timestampWindow(date)
    return listOperationBookings({ createdFrom: stamps.from, createdTo: stamps.to }, signal)
  }
}

export function useOperationsBoard(date: string) {
  const stay = movementWindow(date)
  const movements = useQuery({
    queryKey: ['admin-operations-board', 'movements', stay.checkIn, stay.checkOut],
    queryFn: ({ signal }) => listOperationBookings({ checkIn: stay.checkIn, checkOut: stay.checkOut }, signal),
    retry: false,
  })
  const created = useQuery({
    queryKey: ['admin-operations-board', 'created', date],
    queryFn: ({ signal }) => listCreatedOnHotelDate(date, signal),
    retry: false,
  })
  const cancelled = useQuery({
    queryKey: ['admin-operations-board', 'cancelled', date],
    queryFn: ({ signal }) =>
      listOperationBookings(
        { cancelledFrom: date, cancelledTo: addCalendarDays(date, 1), status: 'CANCELLED' },
        signal,
      ),
    retry: false,
  })
  const calendar = useQuery({
    queryKey: ['admin-operations-board', 'calendar', date],
    queryFn: ({ signal }) => getAdminCalendar({ from: date, to: stay.checkOut, active: true }, signal),
    retry: false,
  })
  return { movements, created, cancelled, calendar }
}
