import { ApiError } from '@/lib/api-error'
import { addCalendarDays, HOTEL_TIME_ZONE, nightsBetween, todayIso } from '@/lib/dates'
import { formatMoneyAmount, formatPercentAmount, normalizeMoneyString } from '@/lib/format'

export const ADMIN_DASHBOARD_SUMMARY_QUERY_KEY = ['admin-dashboard-summary'] as const
export const DASHBOARD_MAX_PERIOD_DAYS = 366
export const PAYMENT_LEDGER_UNAVAILABLE = 'PAYMENT_LEDGER_NOT_IN_USE'
export const PAYMENTS_UNAVAILABLE_LABEL = 'Облік оплат недоступний'
export const BOOKINGS_OVERLAP_HINT =
  'Рахуються бронювання, чиє проживання перетинає вибрані дати, а не створені в цей період.'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export type AdminDashboardPeriod = {
  from: string
  to: string
}

export type AdminDashboardOccupancy = {
  occupied: number
  available: number
  blocked: number
  sellable: number
  percent: string | null
}

export type AdminDashboardSummary = {
  timezone: string
  period: AdminDashboardPeriod
  today: string
  bookings: {
    total: number
    confirmed: number
    cancelled: number
  }
  arrivals: { checkInsToday: number }
  departures: { checkOutsToday: number }
  occupancy: AdminDashboardOccupancy
  bookingValue: { amount: string; currency: 'UAH' }
  payments: { available: false; reason: string }
}

export type DashboardPeriodParse =
  | { ok: true; from: string; to: string; days: number }
  | { ok: false; message: string }

export function monthStartIso(iso: string) {
  if (!DATE_PATTERN.test(iso)) return iso
  return `${iso.slice(0, 7)}-01`
}

export function defaultDashboardPeriod(now = new Date(), timeZone = HOTEL_TIME_ZONE) {
  const to = todayIso(now, timeZone.trim() || HOTEL_TIME_ZONE)
  return { from: monthStartIso(to), to }
}

export function inclusiveCalendarDays(from: string, to: string) {
  return nightsBetween(from, addCalendarDays(to, 1))
}

export function parseDashboardPeriod(from: string, to: string): DashboardPeriodParse {
  if (!DATE_PATTERN.test(from) || !DATE_PATTERN.test(to)) {
    return { ok: false, message: 'Вкажіть обидві дати у форматі РРРР-ММ-ДД.' }
  }
  if (to < from) {
    return { ok: false, message: 'Дата «до» не може бути раніше за «від».' }
  }
  const days = inclusiveCalendarDays(from, to)
  if (days < 1) {
    return { ok: false, message: 'Дата «до» не може бути раніше за «від».' }
  }
  if (days > DASHBOARD_MAX_PERIOD_DAYS) {
    return { ok: false, message: `Максимальний період — ${DASHBOARD_MAX_PERIOD_DAYS} днів.` }
  }
  return { ok: true, from, to, days }
}

export function occupancyPercentLabel(percent: string | null) {
  if (percent === null) return '—'
  return formatPercentAmount(percent)
}

export function bookingValueLabel(amount: string, currency: 'UAH') {
  if (currency !== 'UAH') return `${amount} ${currency}`
  return formatMoneyAmount(amount)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isCalendarDate(value: unknown): value is string {
  return typeof value === 'string' && DATE_PATTERN.test(value)
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

function isPercent(value: unknown): value is string | null {
  if (value === null) return true
  if (typeof value !== 'string') return false
  return /^(0|[1-9]\d{0,2})(?:\.\d{1,2})?$/.test(value.trim())
}

export function parseAdminDashboardSummary(value: unknown): AdminDashboardSummary {
  if (!isRecord(value)) {
    throw new ApiError('Некоректна відповідь зведення.', 0, 'DASHBOARD_CONTRACT')
  }
  const period = value.period
  const bookings = value.bookings
  const arrivals = value.arrivals
  const departures = value.departures
  const occupancy = value.occupancy
  const bookingValue = value.bookingValue
  const payments = value.payments
  if (
    typeof value.timezone !== 'string' ||
    !value.timezone.trim() ||
    !isCalendarDate(value.today) ||
    !isRecord(period) ||
    !isCalendarDate(period.from) ||
    !isCalendarDate(period.to) ||
    !isRecord(bookings) ||
    !isCount(bookings.total) ||
    !isCount(bookings.confirmed) ||
    !isCount(bookings.cancelled) ||
    !isRecord(arrivals) ||
    !isCount(arrivals.checkInsToday) ||
    !isRecord(departures) ||
    !isCount(departures.checkOutsToday) ||
    !isRecord(occupancy) ||
    !isCount(occupancy.occupied) ||
    !isCount(occupancy.available) ||
    !isCount(occupancy.blocked) ||
    !isCount(occupancy.sellable) ||
    !isPercent(occupancy.percent) ||
    !isRecord(bookingValue) ||
    typeof bookingValue.amount !== 'string' ||
    bookingValue.currency !== 'UAH' ||
    !normalizeMoneyString(bookingValue.amount) ||
    !isRecord(payments) ||
    payments.available !== false ||
    typeof payments.reason !== 'string' ||
    !payments.reason.trim()
  ) {
    throw new ApiError('Некоректна відповідь зведення.', 0, 'DASHBOARD_CONTRACT')
  }
  return {
    timezone: value.timezone.trim(),
    period: { from: period.from, to: period.to },
    today: value.today,
    bookings: {
      total: bookings.total,
      confirmed: bookings.confirmed,
      cancelled: bookings.cancelled,
    },
    arrivals: { checkInsToday: arrivals.checkInsToday },
    departures: { checkOutsToday: departures.checkOutsToday },
    occupancy: {
      occupied: occupancy.occupied,
      available: occupancy.available,
      blocked: occupancy.blocked,
      sellable: occupancy.sellable,
      percent: occupancy.percent,
    },
    bookingValue: { amount: bookingValue.amount, currency: 'UAH' },
    payments: { available: false, reason: payments.reason },
  }
}

export function isDashboardNotFound(error: unknown) {
  return error instanceof ApiError && error.status === 404
}
