import { addCalendarDays } from '@/lib/dates'
import { canManageAccommodations } from '@/lib/roles'
import type { UserRole } from '@/types'

/** Half-open stay [startDate, endDate) on one physical room. */
export type NightSelection = {
  roomId: string
  startDate: string
  endDate: string
}

export function showCalendarBlockButton(role: UserRole | undefined) {
  return canManageAccommodations(role)
}

/** Writers pick a range first. Other staff keep the one-click booking shortcut. */
export function emptyNightIntent(role: UserRole | undefined): 'select' | 'book' {
  return canManageAccommodations(role) ? 'select' : 'book'
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export function isIsoDate(value: string) {
  return ISO_DATE.test(value)
}

/** Booking form query. checkOut is the selection's exclusive end, unchanged. */
export function bookingQueryFromSelection(selection: NightSelection) {
  return {
    roomId: selection.roomId,
    checkIn: selection.startDate,
    checkOut: selection.endDate,
  }
}

/**
 * Values for BlockDatesDialog.
 * A chessboard selection is copied as stored: start night and exclusive end, same room.
 * With no selection, the range is one night from `today` and the room is left unset.
 */
export function blockDialogPrefill(input: { selection: NightSelection | null; today: string }): {
  roomId: string
  startDate: string
  endDate: string
} {
  const selection = input.selection
  if (
    selection &&
    selection.roomId &&
    isIsoDate(selection.startDate) &&
    isIsoDate(selection.endDate) &&
    selection.endDate > selection.startDate
  ) {
    return {
      roomId: selection.roomId,
      startDate: selection.startDate,
      endDate: selection.endDate,
    }
  }
  const startDate = isIsoDate(input.today) ? input.today : '2026-01-01'
  return {
    roomId: '',
    startDate,
    endDate: addCalendarDays(startDate, 1),
  }
}

/** Keep the end exclusive and strictly after the start. Does not shift a valid end. */
export function repairBlockEndDate(startDate: string, endDate: string) {
  if (!isIsoDate(startDate)) return endDate
  if (!isIsoDate(endDate) || endDate <= startDate) return addCalendarDays(startDate, 1)
  return endDate
}

export function nextNightSelection(input: {
  current: NightSelection | null
  roomId: string
  date: string
  availableDates: ReadonlySet<string>
}): { selection: NightSelection | null; crossedOccupied: boolean } {
  if (!input.availableDates.has(input.date)) {
    return { selection: input.current, crossedOccupied: false }
  }
  const single: NightSelection = {
    roomId: input.roomId,
    startDate: input.date,
    endDate: addCalendarDays(input.date, 1),
  }
  if (!input.current || input.current.roomId !== input.roomId) {
    return { selection: single, crossedOccupied: false }
  }
  const currentLast = addCalendarDays(input.current.endDate, -1)
  const startDate = input.date < input.current.startDate ? input.date : input.current.startDate
  const lastDate = input.date > currentLast ? input.date : currentLast
  const endDate = addCalendarDays(lastDate, 1)
  let cursor = startDate
  while (cursor < endDate) {
    if (!input.availableDates.has(cursor)) {
      return { selection: input.current, crossedOccupied: true }
    }
    cursor = addCalendarDays(cursor, 1)
  }
  return {
    selection: { roomId: input.roomId, startDate, endDate },
    crossedOccupied: false,
  }
}
