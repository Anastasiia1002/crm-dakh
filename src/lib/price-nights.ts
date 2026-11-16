import { addCalendarDays, nightsBetween, todayIso } from '@/lib/dates'

export type PricePeriodPresetId = 'current-month' | 'next-month' | 'current-year'

export const PRICE_PERIOD_PRESETS: { id: PricePeriodPresetId; label: string }[] = [
  { id: 'current-month', label: 'Поточний місяць' },
  { id: 'next-month', label: 'Наступний місяць' },
  { id: 'current-year', label: 'Поточний рік' },
]

export function exclusiveEndFromLastNight(lastNight: string) {
  return addCalendarDays(lastNight, 1)
}

export function lastNightFromExclusiveEnd(endDate: string) {
  return addCalendarDays(endDate, -1)
}

export function inclusiveNightCount(firstNight: string, lastNight: string) {
  if (!firstNight || !lastNight || lastNight < firstNight) return 0
  return nightsBetween(firstNight, exclusiveEndFromLastNight(lastNight))
}

function ymd(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function lastDayOfMonth(year: number, month: number) {
  const utc = new Date(Date.UTC(year, month, 0))
  return utc.getUTCDate()
}

export function pricePeriodRange(id: PricePeriodPresetId, today = todayIso()): { firstNight: string; lastNight: string } {
  const [year, month] = today.split('-').map(Number)
  if (id === 'current-month') {
    return { firstNight: ymd(year, month, 1), lastNight: ymd(year, month, lastDayOfMonth(year, month)) }
  }
  if (id === 'next-month') {
    const nextYear = month === 12 ? year + 1 : year
    const nextMonth = month === 12 ? 1 : month + 1
    return {
      firstNight: ymd(nextYear, nextMonth, 1),
      lastNight: ymd(nextYear, nextMonth, lastDayOfMonth(nextYear, nextMonth)),
    }
  }
  return { firstNight: ymd(year, 1, 1), lastNight: ymd(year, 12, 31) }
}
