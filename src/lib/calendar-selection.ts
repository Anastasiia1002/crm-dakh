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
