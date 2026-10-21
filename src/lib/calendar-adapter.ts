import { addCalendarDays } from '@/lib/dates'
import type {
  AdminBookingListItem,
  AdminCalendarNight,
  AdminCalendarView,
  BookingStatus,
  CalendarNightState,
  ChessboardAdminBar,
  ChessboardBookingBar,
  ChessboardGroup,
  ChessboardModel,
  ChessboardRoomRow,
  RoomType,
  RoomTypeKind,
} from '@/types'

const ADMIN_STATES: ReadonlySet<CalendarNightState> = new Set([
  'BLOCKED',
  'MAINTENANCE',
  'OUT_OF_ORDER',
  'INACTIVE',
])

const OCCUPANCY_STATES: ReadonlySet<CalendarNightState> = new Set(['BOOKED', 'CHECKED_IN'])

type Span = { startDate: string; endDate: string; nights: AdminCalendarNight[] }

export type RoomTypeKindInfo = Pick<RoomType, 'id' | 'kind' | 'name'>

/**
 * Build Chessboard model from Availability calendar + optional booking enrichment.
 * Occupancy bars are derived from availability nights (authoritative).
 * Booking metadata only enriches label/status; missing metadata never clears occupancy.
 */
export function buildChessboardModel(input: {
  calendar: AdminCalendarView
  /** Kind/name metadata keyed by RoomType id (from GET type or list). */
  roomTypeMeta: RoomTypeKindInfo[]
  bookings: AdminBookingListItem[]
  kindFilter: RoomTypeKind | 'all'
}): ChessboardModel {
  const metaById = new Map(input.roomTypeMeta.map((type) => [type.id, type]))
  const bookingById = new Map(input.bookings.map((booking) => [booking.id, booking]))
  const dates = resolveDates(input.calendar)
  const occupiedBookingIds = new Set<string>()
  const unresolvedRoomTypeIds: string[] = []
  const bookingBars: ChessboardBookingBar[] = []
  const adminBars: ChessboardAdminBar[] = []
  const groups: ChessboardGroup[] = []

  for (const type of input.calendar.roomTypes) {
    const meta = metaById.get(type.roomTypeId)
    const kind: RoomTypeKind | 'UNKNOWN' = meta?.kind ?? 'UNKNOWN'
    if (!meta) unresolvedRoomTypeIds.push(type.roomTypeId)

    // Never drop inventory for missing kind metadata. Only exclude when kind is known and mismatched.
    if (input.kindFilter !== 'all' && kind !== 'UNKNOWN' && kind !== input.kindFilter) {
      continue
    }

    const rooms: ChessboardRoomRow[] = type.rooms.map((room) => ({
      roomId: room.roomId,
      number: room.number,
      roomTypeId: type.roomTypeId,
      roomTypeName: meta?.name ?? type.name,
      kind,
      status: room.status,
      active: room.active,
      nights: room.nights,
    }))

    if (rooms.length === 0) continue

    for (const room of rooms) {
      for (const span of stitchBookingSpans(room.nights)) {
        const bookingId = span.nights[0]?.bookingId
        if (!bookingId) continue
        occupiedBookingIds.add(bookingId)
        const bookingMeta = bookingById.get(bookingId)
        const roomAssigned =
          bookingMeta?.rooms.some((assigned) => assigned.roomId === room.roomId) ?? false
        bookingBars.push({
          bookingId,
          roomId: room.roomId,
          startDate: span.startDate,
          endDate: span.endDate,
          status: resolveBarStatus(bookingMeta),
          label: bookingMeta ? guestLabel(bookingMeta) : 'Бронювання',
          metadataMissing: !bookingMeta || !roomAssigned,
        })
      }

      for (const span of stitchAdminSpans(room.nights)) {
        const state = span.nights[0]?.state
        if (!state || !ADMIN_STATES.has(state)) continue
        const blockId = span.nights.find((night) => night.blockId)?.blockId ?? null
        adminBars.push({
          key: `${room.roomId}:${span.startDate}:${span.endDate}:${state}`,
          roomId: room.roomId,
          startDate: span.startDate,
          endDate: span.endDate,
          kind: state as ChessboardAdminBar['kind'],
          blockId,
          label: adminLabel(state as ChessboardAdminBar['kind']),
        })
      }
    }

    groups.push({
      roomTypeId: type.roomTypeId,
      name: meta?.name ?? type.name,
      kind,
      rooms,
    })
  }

  const missingBookingIds = [...occupiedBookingIds].filter((id) => !bookingById.has(id))

  return {
    from: input.calendar.from,
    to: input.calendar.to,
    dates,
    groups,
    bookingBars,
    adminBars,
    missingBookingIds,
    unresolvedRoomTypeIds: [...new Set(unresolvedRoomTypeIds)],
  }
}

function resolveDates(calendar: AdminCalendarView): string[] {
  for (const type of calendar.roomTypes) {
    for (const room of type.rooms) {
      if (room.nights.length > 0) return room.nights.map((night) => night.date)
    }
  }
  const dates: string[] = []
  let cursor = calendar.from
  while (cursor < calendar.to) {
    dates.push(cursor)
    cursor = addCalendarDays(cursor, 1)
    if (dates.length > 366) break
  }
  return dates
}

/** Consecutive occupied nights with the same bookingId become one bar. Gaps reset. */
export function stitchBookingSpans(nights: AdminCalendarNight[]): Span[] {
  const spans: Span[] = []
  let current: Span | null = null

  for (const night of nights) {
    const occupied = OCCUPANCY_STATES.has(night.state) && Boolean(night.bookingId)
    if (!occupied || !night.bookingId) {
      current = null
      continue
    }
    if (current && current.nights[0]?.bookingId === night.bookingId) {
      current.endDate = addCalendarDays(night.date, 1)
      current.nights.push(night)
      continue
    }
    current = {
      startDate: night.date,
      endDate: addCalendarDays(night.date, 1),
      nights: [night],
    }
    spans.push(current)
  }
  return spans
}

export function stitchAdminSpans(nights: AdminCalendarNight[]): Span[] {
  const spans: Span[] = []
  let current: Span | null = null

  for (const night of nights) {
    if (!ADMIN_STATES.has(night.state)) {
      current = null
      continue
    }
    if (current && current.nights[0]?.state === night.state) {
      current.endDate = addCalendarDays(night.date, 1)
      current.nights.push(night)
      continue
    }
    current = {
      startDate: night.date,
      endDate: addCalendarDays(night.date, 1),
      nights: [night],
    }
    spans.push(current)
  }
  return spans
}

/** Status comes only from booking metadata — never inferred from AVAILABLE calendar states. */
function resolveBarStatus(meta?: AdminBookingListItem): BookingStatus | 'UNKNOWN' {
  if (meta) return meta.status
  return 'UNKNOWN'
}

function guestLabel(booking: AdminBookingListItem) {
  const last = booking.guest.lastName?.trim()
  const first = booking.guest.firstName?.trim()
  if (last && first) return `${last} ${first.charAt(0)}.`
  if (last) return last
  if (first) return first
  return booking.id.slice(0, 8)
}

function adminLabel(kind: ChessboardAdminBar['kind']) {
  if (kind === 'MAINTENANCE') return 'Обслуговування'
  if (kind === 'OUT_OF_ORDER') return 'Не працює'
  if (kind === 'INACTIVE') return 'Неактивний'
  return 'Заблоковано'
}
