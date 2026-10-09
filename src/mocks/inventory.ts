import { addCalendarDays, isDateInHalfOpenRange, stayOverlaps, stayOverlapsHalfOpenBlock, todayIso } from '@/lib/dates'
import { HOLDING_STATUSES } from '@/lib/labels'
import type { BookingStatus } from '@/types'
import * as db from '@/mocks/db'

export function holdingBookings(excludeId?: string) {
  return db.bookings.filter(
    (booking) => HOLDING_STATUSES.includes(booking.status) && booking.id !== excludeId,
  )
}

export function findBookingConflict(
  accommodationId: string,
  checkIn: string,
  checkOut: string,
  excludeId?: string,
) {
  return holdingBookings(excludeId).find(
    (booking) =>
      booking.accommodationId === accommodationId &&
      stayOverlaps(checkIn, checkOut, booking.checkIn, booking.checkOut),
  )
}

export function findBlockConflict(accommodationId: string, checkIn: string, checkOut: string) {
  return db.blocks.find(
    (block) =>
      block.roomId === accommodationId &&
      stayOverlapsHalfOpenBlock(checkIn, checkOut, block.startDate, block.endDate),
  )
}

export function isOccupiedOn(accommodationId: string, date: string, statuses: BookingStatus[] = HOLDING_STATUSES) {
  const next = addCalendarDays(date, 1)
  return db.bookings.some(
    (booking) =>
      booking.accommodationId === accommodationId &&
      statuses.includes(booking.status) &&
      stayOverlaps(date, next, booking.checkIn, booking.checkOut),
  )
}

export function isBlockedOn(accommodationId: string, date: string) {
  return db.blocks.some(
    (block) => block.roomId === accommodationId && isDateInHalfOpenRange(date, block.startDate, block.endDate),
  )
}

export function availableRoomCount(date = todayIso()) {
  return db.accommodations.filter(
    (item) => item.kind === 'room' && !isOccupiedOn(item.id, date) && !isBlockedOn(item.id, date),
  ).length
}

export function occupiedUnitCount(date = todayIso()) {
  return db.accommodations.filter((item) => isOccupiedOn(item.id, date)).length
}
