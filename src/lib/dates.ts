import { addDays, format, parseISO } from 'date-fns'

export function todayIso() {
  return format(new Date(), 'yyyy-MM-dd')
}

export function addDaysIso(iso: string, days: number) {
  return format(addDays(parseISO(iso), days), 'yyyy-MM-dd')
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
  const blockEndExclusive = addDaysIso(blockTo, 1)
  return stayOverlaps(checkIn, checkOut, blockFrom, blockEndExclusive)
}

export function isDateInInclusiveRange(date: string, from: string, to: string) {
  return date >= from && date <= to
}
