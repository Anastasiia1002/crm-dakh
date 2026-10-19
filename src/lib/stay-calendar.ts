import { addCalendarDays, nightsBetween } from '@/lib/dates'
import type { CalendarNightState } from '@/types'

export const HOTEL_TIME_ZONE = 'Europe/Kyiv'

export type NightAvailability = 'free' | 'occupied' | 'blocked'

export type BookingWindowRules = {
  timeZone: string
  minAdvanceHours: number
  maxAdvanceDays: number | null
  allowSameDayBooking: boolean
  defaultMinStay: number
  defaultMaxStay: number | null
}

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'] as const

export function weekdayLabels() {
  return WEEKDAYS
}

export function kyivTodayIso(now = new Date(), timeZone = HOTEL_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value
  if (!year || !month || !day) return '1970-01-01'
  return `${year}-${month}-${day}`
}

export function monthKey(iso: string) {
  return iso.slice(0, 7)
}

export function shiftMonth(month: string, delta: number) {
  const [year, monthNumber] = month.split('-').map(Number)
  const utc = new Date(Date.UTC(year, monthNumber - 1 + delta, 1))
  const y = utc.getUTCFullYear()
  const m = `${utc.getUTCMonth() + 1}`.padStart(2, '0')
  return `${y}-${m}`
}

/** Monday-first month grid, including leading and trailing dates. */
export function monthGrid(month: string) {
  const start = `${month}-01`
  const [year, monthNumber] = month.split('-').map(Number)
  const firstWeekdaySun0 = new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay()
  const leading = (firstWeekdaySun0 + 6) % 7
  const gridStart = addCalendarDays(start, -leading)
  const dates: string[] = []
  for (let index = 0; index < 42; index += 1) dates.push(addCalendarDays(gridStart, index))
  return dates
}

export function monthQueryRange(month: string) {
  const dates = monthGrid(month)
  return { from: dates[0], to: addCalendarDays(dates[dates.length - 1], 1) }
}

export function roomNightMap(
  roomTypes: ReadonlyArray<{ rooms: ReadonlyArray<{ roomId: string; nights: ReadonlyArray<{ date: string; state: CalendarNightState }> }> }> | undefined,
  roomId: string,
) {
  const map = new Map<string, NightAvailability>()
  if (!roomTypes) return map
  for (const group of roomTypes) {
    const room = group.rooms.find((item) => item.roomId === roomId)
    if (!room) continue
    for (const night of room.nights) map.set(night.date, nightAvailability(night.state))
  }
  return map
}

export function nightAvailability(state: CalendarNightState | undefined): NightAvailability {
  if (!state || state === 'AVAILABLE') return 'free'
  if (state === 'BOOKED' || state === 'CHECKED_IN') return 'occupied'
  return 'blocked'
}

/** Nights in [checkIn, checkOut) must be free. The checkout morning itself is not a night. */
export function stayNightsAvailable(checkIn: string, checkOut: string, nights: ReadonlyMap<string, NightAvailability>) {
  if (!(checkOut > checkIn)) return false
  let cursor = checkIn
  while (cursor < checkOut) {
    if (nights.get(cursor) !== 'free') return false
    cursor = addCalendarDays(cursor, 1)
  }
  return true
}

export function checkInPolicyError(checkIn: string, rules: BookingWindowRules, now = new Date()) {
  const today = kyivTodayIso(now, rules.timeZone)
  if (checkIn < today) return 'Дата заїзду не може бути в минулому.'
  if (!rules.allowSameDayBooking && checkIn === today) {
    return 'Бронювання в день заїзду вимкнено політикою готелю.'
  }
  const earliestInstant = new Date(now.getTime() + rules.minAdvanceHours * 60 * 60 * 1000)
  const earliest = kyivTodayIso(earliestInstant, rules.timeZone)
  if (checkIn < earliest) return 'Заїзд занадто рано відносно мінімального часу бронювання.'
  if (rules.maxAdvanceDays !== null && checkIn > addCalendarDays(today, rules.maxAdvanceDays)) {
    return 'Дата заїзду виходить за межі вікна бронювання.'
  }
  return null
}

export function nightsLabel(count: number) {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return `${count} ніч`
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} ночі`
  return `${count} ночей`
}

export function stayLengthError(checkIn: string, checkOut: string, rules: Pick<BookingWindowRules, 'defaultMinStay' | 'defaultMaxStay'>) {
  if (!(checkOut > checkIn)) return 'Виїзд має бути пізніше заїзду.'
  const nights = nightsBetween(checkIn, checkOut)
  if (nights < rules.defaultMinStay) return `Мінімальна тривалість проживання — ${nightsLabel(rules.defaultMinStay)}.`
  if (rules.defaultMaxStay !== null && nights > rules.defaultMaxStay) {
    return `Максимальна тривалість проживання — ${nightsLabel(rules.defaultMaxStay)}.`
  }
  return null
}

export type DateSelection = { checkIn: string; checkOut: string; error: string | null }

/**
 * First click chooses check-in. A later click chooses the checkout morning.
 * Occupied or blocked nights inside [checkIn, checkOut) are rejected.
 */
export function selectStayDate(input: {
  currentCheckIn: string
  currentCheckOut: string
  clicked: string
  nights: ReadonlyMap<string, NightAvailability>
  rules: BookingWindowRules | null
  now?: Date
}): DateSelection {
  const { clicked, nights, rules } = input
  const availability = nights.has(clicked) ? nights.get(clicked)! : 'blocked'
  const restart = () => {
    if (availability !== 'free') {
      return {
        checkIn: input.currentCheckIn,
        checkOut: input.currentCheckOut,
        error: availability === 'occupied' ? 'Ця ніч уже зайнята.' : 'Ця ніч недоступна.',
      }
    }
    if (rules) {
      const policy = checkInPolicyError(clicked, rules, input.now)
      if (policy) return { checkIn: input.currentCheckIn, checkOut: input.currentCheckOut, error: policy }
    }
    return { checkIn: clicked, checkOut: '', error: null }
  }

  if (!input.currentCheckIn || input.currentCheckOut || clicked <= input.currentCheckIn) return restart()

  if (!stayNightsAvailable(input.currentCheckIn, clicked, nights)) {
    return {
      checkIn: input.currentCheckIn,
      checkOut: input.currentCheckOut,
      error: 'Обраний період перетинається із зайнятою або недоступною ніччю.',
    }
  }
  if (rules) {
    const lengthError = stayLengthError(input.currentCheckIn, clicked, rules)
    if (lengthError) {
      return { checkIn: input.currentCheckIn, checkOut: input.currentCheckOut, error: lengthError }
    }
  }
  return { checkIn: input.currentCheckIn, checkOut: clicked, error: null }
}
