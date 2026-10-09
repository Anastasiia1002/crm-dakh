import { useQueries, useQuery } from '@tanstack/react-query'
import { getRoomType, listAllRoomTypes } from '@/api/accommodations'
import { listAllOverlappingBookings } from '@/api/admin-bookings'
import { getAdminCalendar } from '@/api/availability'
import { buildChessboardModel } from '@/lib/calendar-adapter'
import { addCalendarDays } from '@/lib/dates'
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
}) {
  const days = Math.min(Math.max(input.days ?? CALENDAR_WINDOW_DAYS, 1), CALENDAR_MAX_WINDOW_DAYS)
  const to = calendarWindowEnd(input.from, days)
  const query: AdminCalendarQuery = {
    from: input.from,
    to,
    roomTypeId: input.roomTypeId,
  }

  const calendarQuery = useQuery({
    queryKey: ['admin-calendar', query],
    queryFn: ({ signal }) => getAdminCalendar(query, signal),
  })

  const calendarTypeIds = calendarQuery.data?.roomTypes.map((type) => type.roomTypeId) ?? []

  // Fetch kind/name only for RoomTypes present on the loaded calendar (no first-100 truncation).
  const typeDetailQueries = useQueries({
    queries: calendarTypeIds.map((id) => ({
      queryKey: ['admin-room-type', id],
      queryFn: ({ signal }: { signal?: AbortSignal }) => getRoomType(id, signal),
      enabled: Boolean(calendarQuery.data),
    })),
  })

  // Filter dropdown: paginate all types for the active kind filter (avoids unrelated kinds when scoped).
  const pickerTypesQuery = useQuery({
    queryKey: ['admin-room-types-all', { kind: input.kind }],
    queryFn: ({ signal }) =>
      listAllRoomTypes(
        { kind: input.kind === 'all' ? undefined : input.kind },
        signal,
      ),
  })

  const bookingsQuery = useQuery({
    queryKey: ['admin-calendar-bookings', { from: query.from, to: query.to }],
    queryFn: ({ signal }) => listAllOverlappingBookings(query.from, query.to, signal),
    placeholderData: (previous) => previous,
  })

  const typeMetaReady =
    calendarTypeIds.length === 0 ||
    typeDetailQueries.every((item) => item.isSuccess || item.isError)

  const roomTypeMeta = typeDetailQueries
    .map((item) => item.data)
    .filter((item): item is NonNullable<typeof item> => Boolean(item))

  const model =
    calendarQuery.data && typeMetaReady
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

  const typesLoading =
    (calendarQuery.data &&
      calendarTypeIds.length > 0 &&
      typeDetailQueries.some((item) => item.isLoading || item.isFetching)) ||
    (pickerTypesQuery.isLoading && !pickerTypesQuery.data)

  return {
    from: query.from,
    to: query.to,
    days,
    model,
    calendarQuery,
    bookingsQuery,
    pickerTypesQuery,
    isLoading: (calendarQuery.isLoading && !calendarQuery.data) || typesLoading,
    isError: calendarQuery.isError,
    enrichmentFailed,
    enrichmentIncomplete,
    typesIncomplete,
    refetchAll: () => {
      void calendarQuery.refetch()
      void bookingsQuery.refetch()
      void pickerTypesQuery.refetch()
      for (const item of typeDetailQueries) void item.refetch()
    },
  }
}
