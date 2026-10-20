import { useQuery } from '@tanstack/react-query'
import { listAllRoomTypes } from '@/api/accommodations'
import { listAllOverlappingBookings } from '@/api/admin-bookings'
import { getAdminCalendar } from '@/api/availability'
import { buildChessboardModel } from '@/lib/calendar-adapter'
import { addCalendarDays } from '@/lib/dates'
import { activeFilterToQuery, type InventoryActiveFilter } from '@/lib/inventory-status'
import { CATALOG_STALE_TIME, OPERATIONAL_STALE_TIME } from '@/lib/queryClient'
import type { AdminCalendarQuery, RoomTypeKind } from '@/types'

export const CALENDAR_WINDOW_DAYS = 14
export const CALENDAR_MAX_WINDOW_DAYS = 31

export function calendarWindowEnd(from: string, days: number) {
  const capped = Math.min(Math.max(days, 1), CALENDAR_MAX_WINDOW_DAYS)
  return addCalendarDays(from, capped)
}

export function useAdminCalendarBoard(input: {
  from: string
  days?: number
  roomTypeId?: string
  kind: RoomTypeKind | 'all'
  /** Default operational view is active-only. */
  inventoryFilter?: InventoryActiveFilter
}) {
  const days = Math.min(Math.max(input.days ?? CALENDAR_WINDOW_DAYS, 1), CALENDAR_MAX_WINDOW_DAYS)
  const to = calendarWindowEnd(input.from, days)
  const inventoryFilter = input.inventoryFilter ?? 'active'
  const active = activeFilterToQuery(inventoryFilter)
  const query: AdminCalendarQuery = {
    from: input.from,
    to,
    roomTypeId: input.roomTypeId,
    active,
  }

  const calendarQuery = useQuery({
    queryKey: ['admin-calendar', query],
    queryFn: ({ signal }) => getAdminCalendar(query, signal),
    staleTime: OPERATIONAL_STALE_TIME,
  })

  // One paged type list supplies kind for every category on the calendar.
  const pickerTypesQuery = useQuery({
    queryKey: ['admin-room-types-all', { active }],
    queryFn: ({ signal }) => listAllRoomTypes({ active }, signal),
    staleTime: CATALOG_STALE_TIME,
  })

  // Booking enrichment is independent of inventory visibility — historical stays stay accessible.
  const bookingsQuery = useQuery({
    queryKey: ['admin-calendar-bookings', { from: query.from, to: query.to }],
    queryFn: ({ signal }) => listAllOverlappingBookings(query.from, query.to, signal),
    placeholderData: (previous) => previous,
    staleTime: OPERATIONAL_STALE_TIME,
  })

  const roomTypeMeta = (pickerTypesQuery.data ?? []).map((type) => ({
    id: type.id,
    kind: type.kind,
    name: type.name,
  }))

  const model = calendarQuery.data
    ? buildChessboardModel({
        calendar: calendarQuery.data,
        roomTypeMeta,
        bookings: bookingsQuery.data ?? [],
        kindFilter: input.kind,
      })
    : undefined

  const enrichmentFailed = Boolean(calendarQuery.data && bookingsQuery.isError)
  const enrichmentIncomplete = Boolean(
    model && model.missingBookingIds.length > 0 && !bookingsQuery.isLoading && !bookingsQuery.isError,
  )
  const typesIncomplete = Boolean(model && model.unresolvedRoomTypeIds.length > 0)

  const kindPending = input.kind !== 'all' && pickerTypesQuery.isLoading && !pickerTypesQuery.data

  return {
    from: query.from,
    to: query.to,
    days,
    model,
    calendarQuery,
    bookingsQuery,
    pickerTypesQuery,
    isLoading: (calendarQuery.isLoading && !calendarQuery.data) || kindPending,
    isError: calendarQuery.isError,
    enrichmentFailed,
    enrichmentIncomplete,
    typesIncomplete,
    refetchAll: () => {
      void calendarQuery.refetch()
      void bookingsQuery.refetch()
      void pickerTypesQuery.refetch()
    },
  }
}
