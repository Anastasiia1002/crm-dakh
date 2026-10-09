import { addDays, format, parseISO } from 'date-fns'

export function todayIso() {
  return format(new Date(), 'yyyy-MM-dd')
}

export function addDaysIso(iso: string, days: number) {
  return format(addDays(parseISO(iso), days), 'yyyy-MM-dd')
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
  return Array.from({ length: days }, (_, index) => addDaysIso(from, index))
}

export function nightsBetween(checkIn: string, checkOut: string) {
  const start = parseISO(checkIn).getTime()
  const end = parseISO(checkOut).getTime()
  return Math.round((end - start) / 86_400_000)
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
