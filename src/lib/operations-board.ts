import { adminBookingRef, adminGuestName, adminRoomsLabel } from '@/lib/admin-booking-view'
import { addCalendarDays, todayIso } from '@/lib/dates'
import type { AdminBookingListItem, AdminCalendarView, BookingStatus, RoomStatus } from '@/types'

export type OperationTab = 'inHouse' | 'arrivals' | 'departures' | 'created' | 'cancelled'

export type OperationBooking = {
  id: string
  status: BookingStatus
  checkIn: string
  checkOut: string
  createdAt: string
  cancelledAt: string | null
  guestName: string
  accommodation: string
}

export type OperationSortKey = 'guest' | 'accommodation' | 'checkIn' | 'checkOut' | 'status' | 'reference'

export type DateOccupancy = {
  occupied: number
  available: number
  blocked: number
  sellable: number
  percent: string | null
}

const ARRIVAL_EXCLUDED = new Set<BookingStatus>(['CANCELLED', 'NO_SHOW'])
const DEPARTURE_STATUSES = new Set<BookingStatus>(['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'])

export const OPERATION_PAGE_LIMIT = 100
export const OPERATION_MAX_PAGES = 5

/** Half-open stay window that contains arrivals, the selected night, and departures. */
export function movementWindow(date: string) {
  return { checkIn: addCalendarDays(date, -1), checkOut: addCalendarDays(date, 1) }
}

/**
 * createdAt and cancelledAt are instants. The list filters compare them with UTC midnight,
 * so the request is widened and the hotel calendar date is applied afterwards.
 */
export function timestampWindow(date: string) {
  return { from: addCalendarDays(date, -1), to: addCalendarDays(date, 2) }
}

export function hotelDateFromInstant(iso: string, timeZone: string) {
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return null
  return todayIso(parsed, timeZone)
}

export function toOperationBooking(item: AdminBookingListItem): OperationBooking {
  return {
    id: item.id,
    status: item.status,
    checkIn: item.checkIn,
    checkOut: item.checkOut,
    createdAt: item.createdAt,
    cancelledAt: item.cancelledAt ?? null,
    guestName: adminGuestName(item.guest),
    accommodation: adminRoomsLabel(item.rooms),
  }
}

export function stayCoversNight(checkIn: string, checkOut: string, date: string) {
  return checkIn <= date && checkOut > date
}

export function splitStayOperations(bookings: readonly OperationBooking[], date: string) {
  return {
    inHouse: bookings.filter(
      (booking) => stayCoversNight(booking.checkIn, booking.checkOut, date) && !ARRIVAL_EXCLUDED.has(booking.status),
    ),
    arrivals: bookings.filter((booking) => booking.checkIn === date && !ARRIVAL_EXCLUDED.has(booking.status)),
    departures: bookings.filter((booking) => booking.checkOut === date && DEPARTURE_STATUSES.has(booking.status)),
  }
}

export function bookingsOnHotelDate(
  bookings: readonly OperationBooking[],
  date: string,
  timeZone: string,
  field: 'createdAt' | 'cancelledAt',
) {
  return bookings.filter((booking) => hotelDateFromInstant(booking[field] ?? '', timeZone) === date)
}

/**
 * Same unit rules as the backend summary snapshot, for one calendar night from the
 * availability calendar. Inactive and non-available inventory, including out of order,
 * is omitted. Blocked nights of an available unit stay in the blocked count.
 * Room and cottage kinds are not separated: the calendar payload has no kind.
 */
export function occupancyForNight(view: AdminCalendarView, date: string): DateOccupancy {
  let occupied = 0
  let available = 0
  let blocked = 0
  for (const type of view.roomTypes) {
    for (const room of type.rooms) {
      if (!room.active || room.status !== ('AVAILABLE' satisfies RoomStatus)) continue
      const night = room.nights.find((item) => item.date === date)
      if (!night) continue
      if (night.state === 'BOOKED' || night.state === 'CHECKED_IN') occupied += 1
      else if (night.state === 'AVAILABLE') available += 1
      else blocked += 1
    }
  }
  const sellable = occupied + available
  return { occupied, available, blocked, sellable, percent: sellablePercent(occupied, sellable) }
}

/** Integer percent with two decimals. Null when nothing is sellable. */
export function sellablePercent(occupied: number, sellable: number): string | null {
  if (sellable <= 0) return null
  const rounded = Number((BigInt(occupied) * 10000n + BigInt(sellable) / 2n) / BigInt(sellable))
  const whole = Math.trunc(rounded / 100)
  const fraction = (rounded % 100).toString().padStart(2, '0')
  return `${whole}.${fraction}`
}

export function attentionBookings(inHouse: readonly OperationBooking[], arrivals: readonly OperationBooking[]) {
  const seen = new Set<string>()
  const items: OperationBooking[] = []
  for (const booking of [...arrivals, ...inHouse]) {
    if (booking.status !== 'PENDING' || seen.has(booking.id)) continue
    seen.add(booking.id)
    items.push(booking)
  }
  return items
}

export function matchesOperationSearch(booking: OperationBooking, term: string) {
  const query = term.trim().toLowerCase()
  if (!query) return true
  const reference = adminBookingRef(booking.id).toLowerCase()
  return (
    booking.guestName.toLowerCase().includes(query) ||
    booking.accommodation.toLowerCase().includes(query) ||
    booking.id.toLowerCase().includes(query) ||
    reference.includes(query)
  )
}

export function sortOperationBookings(
  bookings: readonly OperationBooking[],
  key: OperationSortKey,
  direction: 'asc' | 'desc',
) {
  const factor = direction === 'asc' ? 1 : -1
  const value = (booking: OperationBooking) => {
    if (key === 'guest') return booking.guestName
    if (key === 'accommodation') return booking.accommodation
    if (key === 'checkIn') return booking.checkIn
    if (key === 'checkOut') return booking.checkOut
    if (key === 'status') return booking.status
    return adminBookingRef(booking.id)
  }
  return [...bookings].sort((left, right) => {
    const compared = value(left).localeCompare(value(right), 'uk')
    if (compared !== 0) return compared * factor
    return left.id.localeCompare(right.id) * factor
  })
}
