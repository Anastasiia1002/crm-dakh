import { addCalendarDays, eachDate } from '@/lib/dates'
import { delay } from '@/mocks/delay'
import * as db from '@/mocks/db'
import { isBlockedOn, isOccupiedOn } from '@/mocks/inventory'
import type { AccommodationKind } from '@/types'

function addOneDay(iso: string) {
  return addCalendarDays(iso, 1)
}

export async function getCalendar(from: string, days: number, kind: AccommodationKind | 'all' = 'all') {
  await delay()
  const dates = eachDate(from, days)
  const accommodations = db.accommodations.filter((item) => kind === 'all' || item.kind === kind)
  const ids = new Set(accommodations.map((item) => item.id))
  const last = dates[dates.length - 1]
  const bookings = db.bookings.filter(
    (booking) =>
      ids.has(booking.accommodationId) &&
      booking.status !== 'CANCELLED' &&
      booking.status !== 'NO_SHOW' &&
      booking.checkIn <= last &&
      booking.checkOut > from,
  )
  const blocks = db.blocks.filter(
    (block) => ids.has(block.roomId) && block.startDate < addOneDay(last) && block.endDate > from,
  )
  return {
    dates,
    accommodations: structuredClone(accommodations),
    roomTypes: structuredClone(db.roomTypes),
    bookings: structuredClone(bookings),
    blocks: structuredClone(blocks),
    guests: structuredClone(db.guests),
    occupancy: dates.map((date) => ({
      date,
      occupied: accommodations.filter((item) => isOccupiedOn(item.id, date)).length,
      blocked: accommodations.filter((item) => isBlockedOn(item.id, date) && !isOccupiedOn(item.id, date)).length,
      total: accommodations.length,
    })),
  }
}
