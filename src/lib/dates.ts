import { format } from 'date-fns'

export function todayIso() {
  return format(new Date(), 'yyyy-MM-dd')
}

/** @deprecated Prefer addCalendarDays for YYYY-MM-DD stay dates (timezone-safe). */
export function addDaysIso(iso: string, days: number) {
  return addCalendarDays(iso, days)
}

/** Shift a YYYY-MM-DD calendar date in UTC so local timezone cannot change the day. */
export function addCalendarDays(iso: string, days: number) {
  const [year, month, day] = iso.split('-').map(Number)
  const utc = Date.UTC(year, month - 1, day + days)
  const shifted = new Date(utc)
  const y = shifted.getUTCFullYear()
  const m = `${shifted.getUTCMonth() + 1}`.padStart(2, '0')
  const d = `${shifted.getUTCDate()}`.padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Half-open stay/block range: date is covered when start <= date < end. */
export function isDateInHalfOpenRange(date: string, startDate: string, endDate: string) {
  return date >= startDate && date < endDate
}

export function roomDisplayName(room: { name: string | null; number: string }) {
  const named = room.name?.trim()
  return named || room.number
}

export function eachDate(from: string, days: number) {
  return Array.from({ length: days }, (_, index) => addCalendarDays(from, index))
}

/** Inclusive night count for half-open [checkIn, checkOut). */
export function nightsBetween(checkIn: string, checkOut: string) {
  let count = 0
  let cursor = checkIn
  while (cursor < checkOut) {
    count += 1
    cursor = addCalendarDays(cursor, 1)
    if (count > 10_000) break
  }
  return count
}

/** Weekday 0=Sun … 6=Sat for a YYYY-MM-DD calendar date (no TZ shift). */
export function calendarWeekday(iso: string) {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day).getDay()
}

/** Day-of-month number for a YYYY-MM-DD calendar date. */
export function calendarDayOfMonth(iso: string) {
  return Number(iso.slice(8, 10))
}

export function stayOverlaps(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return aStart < bEnd && bStart < aEnd
}

export function stayOverlapsInclusiveBlock(
  checkIn: string,
  checkOut: string,
  blockFrom: string,
  blockTo: string,
) {
  const blockEndExclusive = addCalendarDays(blockTo, 1)
  return stayOverlaps(checkIn, checkOut, blockFrom, blockEndExclusive)
}

export function stayOverlapsHalfOpenBlock(
  checkIn: string,
  checkOut: string,
  blockStart: string,
  blockEnd: string,
) {
  return stayOverlaps(checkIn, checkOut, blockStart, blockEnd)
}

export function isDateInInclusiveRange(date: string, from: string, to: string) {
  return date >= from && date <= to
}
