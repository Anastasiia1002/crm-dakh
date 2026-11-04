import { ApiError } from '@/lib/api-error'
import { addCalendarDays, HOTEL_TIME_ZONE, todayIso } from '@/lib/dates'
import { formatMoneyAmount } from '@/lib/format'
import { DASHBOARD_MAX_PERIOD_DAYS, parseDashboardPeriod } from '@/lib/dashboard-summary'
import type { BookingStatus } from '@/types'

export const ADMIN_ANALYTICS_SUMMARY_QUERY_KEY = ['admin-analytics-summary'] as const
export const ANALYTICS_NONE = 'none'
export const PAYMENT_LEDGER_UNAVAILABLE = 'PAYMENT_LEDGER_NOT_IN_USE'

export const ANALYTICS_DATE_TYPES = ['stay', 'created', 'checkIn', 'checkOut', 'cancelled'] as const
export type AnalyticsDateType = (typeof ANALYTICS_DATE_TYPES)[number]

export const ANALYTICS_STATUSES: BookingStatus[] = [
  'PENDING',
  'CONFIRMED',
  'CHECKED_IN',
  'CHECKED_OUT',
  'CANCELLED',
  'NO_SHOW',
]

export const analyticsDateTypeLabel: Record<AnalyticsDateType, string> = {
  stay: 'Дати відпочинку',
  created: 'Дата створення',
  checkIn: 'Дата заїзду',
  checkOut: 'Дата виїзду',
  cancelled: 'Дата скасування',
}

export type AnalyticsPeriodPreset = 'currentMonth' | 'previousMonth' | 'nextMonth' | 'currentYear' | 'custom'

export const analyticsPresetLabel: Record<AnalyticsPeriodPreset, string> = {
  currentMonth: 'Поточний місяць',
  previousMonth: 'Попередній місяць',
  nextMonth: 'Наступний місяць',
  currentYear: 'Поточний рік',
  custom: 'Свої дати',
}

export type AnalyticsMoney = {
  available: true
  amount: string | null
  currency: 'UAH'
  bookingCount: number
  includesCancelled: boolean
}

export type AnalyticsUnavailable = {
  available: false
  reason: string
}

export type AdminAnalyticsSummary = {
  timezone: string
  dateType: AnalyticsDateType
  period: { from: string; to: string }
  definitions: Record<string, string>
  financial: {
    bookingValue: AnalyticsMoney
    revenue: AnalyticsUnavailable
    averageCheck: AnalyticsMoney
    outstanding: AnalyticsUnavailable
    discounts: AnalyticsMoney
  }
  bookings: {
    total: number
    cancelled: number
    completed: number
    incomplete: number
  }
  cancellations: {
    currentlyCancelled: { count: number; amount: string; currency: 'UAH' }
    cancelledDuringPeriod: { count: number; amount: string; currency: 'UAH' }
  }
  sources: { source: string; label: string; count: number; percent: string }[]
  accommodations: {
    roomId: string
    name: string
    roomTypeName: string
    active: boolean
    count: number
  }[]
  guests: { unique: number; new: number; repeatVisits: number }
}

export type AnalyticsFilterState = {
  dateType: AnalyticsDateType
  from: string
  to: string
  categoryIds: string[] | typeof ANALYTICS_NONE | 'all'
  roomIds: string[] | typeof ANALYTICS_NONE | 'all'
  statuses: BookingStatus[] | typeof ANALYTICS_NONE | 'all'
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function monthEndIso(iso: string) {
  if (!DATE_PATTERN.test(iso)) return iso
  const year = Number(iso.slice(0, 4))
  const month = Number(iso.slice(5, 7))
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return `${iso.slice(0, 7)}-${String(last).padStart(2, '0')}`
}

export function shiftMonth(iso: string, delta: number) {
  if (!DATE_PATTERN.test(iso)) return iso
  const year = Number(iso.slice(0, 4))
  const month = Number(iso.slice(5, 7)) - 1 + delta
  const shifted = new Date(Date.UTC(year, month, 1))
  const y = shifted.getUTCFullYear()
  const m = String(shifted.getUTCMonth() + 1).padStart(2, '0')
  return `${y}-${m}-01`
}

export function analyticsPresetRange(preset: Exclude<AnalyticsPeriodPreset, 'custom'>, now = new Date(), timeZone = HOTEL_TIME_ZONE) {
  const today = todayIso(now, timeZone.trim() || HOTEL_TIME_ZONE)
  const thisMonth = `${today.slice(0, 7)}-01`
  if (preset === 'currentMonth') return { from: thisMonth, to: monthEndIso(thisMonth) }
  if (preset === 'previousMonth') {
    const from = shiftMonth(thisMonth, -1)
    return { from, to: monthEndIso(from) }
  }
  if (preset === 'nextMonth') {
    const from = shiftMonth(thisMonth, 1)
    return { from, to: monthEndIso(from) }
  }
  return { from: `${today.slice(0, 4)}-01-01`, to: `${today.slice(0, 4)}-12-31` }
}

export function defaultAnalyticsFilters(now = new Date(), timeZone = HOTEL_TIME_ZONE): AnalyticsFilterState {
  const range = analyticsPresetRange('currentMonth', now, timeZone)
  return {
    dateType: 'stay',
    from: range.from,
    to: range.to,
    categoryIds: 'all',
    roomIds: 'all',
    statuses: 'all',
  }
}

export function parseAnalyticsSearch(search: URLSearchParams, now = new Date(), timeZone = HOTEL_TIME_ZONE): AnalyticsFilterState {
  const defaults = defaultAnalyticsFilters(now, timeZone)
  const dateTypeRaw = search.get('dateType') ?? defaults.dateType
  const dateType = (ANALYTICS_DATE_TYPES as readonly string[]).includes(dateTypeRaw)
    ? (dateTypeRaw as AnalyticsDateType)
    : defaults.dateType
  const from = DATE_PATTERN.test(search.get('from') ?? '') ? search.get('from')! : defaults.from
  const to = DATE_PATTERN.test(search.get('to') ?? '') ? search.get('to')! : defaults.to
  return {
    dateType,
    from,
    to,
    categoryIds: parseIdFilter(search.get('categories')),
    roomIds: parseIdFilter(search.get('rooms')),
    statuses: parseStatusFilter(search.get('statuses')),
  }
}

export function analyticsSearchParams(filters: AnalyticsFilterState): URLSearchParams {
  const search = new URLSearchParams()
  search.set('dateType', filters.dateType)
  search.set('from', filters.from)
  search.set('to', filters.to)
  writeFilter(search, 'categories', filters.categoryIds)
  writeFilter(search, 'rooms', filters.roomIds)
  writeFilter(search, 'statuses', filters.statuses)
  return search
}

export function toAnalyticsQuery(filters: AnalyticsFilterState): {
  from: string
  to: string
  dateType: AnalyticsDateType
  categoryIds?: string[]
  roomIds?: string[]
  statuses?: BookingStatus[]
} {
  return {
    from: filters.from,
    to: filters.to,
    dateType: filters.dateType,
    categoryIds: selectedIds(filters.categoryIds),
    roomIds: selectedIds(filters.roomIds),
    statuses: selectedIds(filters.statuses),
  }
}

export function bookingListHref(filters: AnalyticsFilterState, group: 'all' | 'cancelled' | 'completed'): string {
  const search = new URLSearchParams()
  if (group === 'cancelled') search.set('status', 'CANCELLED')
  if (group === 'completed') search.set('status', 'CHECKED_OUT')
  const next = addCalendarDays(filters.to, 1)
  if (filters.dateType === 'stay') {
    search.set('checkIn', filters.from)
    search.set('checkOut', next)
  } else if (filters.dateType === 'created') {
    search.set('createdLocalFrom', filters.from)
    search.set('createdLocalTo', next)
  } else if (filters.dateType === 'cancelled') {
    search.set('cancelledFrom', filters.from)
    search.set('cancelledTo', next)
  }
  const rooms = selectedIds(filters.roomIds)
  if (rooms?.length === 1) search.set('roomId', rooms[0]!)
  const suffix = search.toString()
  return suffix ? `/admin/bookings?${suffix}` : '/admin/bookings'
}

export function moneyOrUnavailable(value: AnalyticsMoney | AnalyticsUnavailable): string {
  if (!value.available) return 'Недоступно'
  if (value.amount === null) return '—'
  return formatMoneyAmount(value.amount)
}

function parseIdFilter(raw: string | null): string[] | typeof ANALYTICS_NONE | 'all' {
  if (raw === null) return 'all'
  if (raw === ANALYTICS_NONE || raw === '') return ANALYTICS_NONE
  const ids = raw.split(',').map((item) => item.trim()).filter((item) => UUID_PATTERN.test(item))
  return ids.length > 0 ? ids : ANALYTICS_NONE
}

function parseStatusFilter(raw: string | null): BookingStatus[] | typeof ANALYTICS_NONE | 'all' {
  if (raw === null) return 'all'
  if (raw === ANALYTICS_NONE || raw === '') return ANALYTICS_NONE
  const statuses = raw
    .split(',')
    .map((item) => item.trim())
    .filter((item): item is BookingStatus => (ANALYTICS_STATUSES as string[]).includes(item))
  return statuses.length > 0 ? statuses : ANALYTICS_NONE
}

function writeFilter(search: URLSearchParams, key: string, value: string[] | typeof ANALYTICS_NONE | 'all') {
  if (value === 'all') return
  if (value === ANALYTICS_NONE) {
    search.set(key, ANALYTICS_NONE)
    return
  }
  search.set(key, value.join(','))
}

function selectedIds<T extends string>(value: T[] | typeof ANALYTICS_NONE | 'all'): T[] | undefined {
  if (value === 'all') return undefined
  if (value === ANALYTICS_NONE) return []
  return value
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

function isMoneyString(value: unknown): value is string {
  return typeof value === 'string' && /^(0|[1-9]\d*)(?:\.\d{1,2})?$/.test(value.trim())
}

function parseMoney(value: unknown, field: string): AnalyticsMoney {
  if (!isRecord(value) || value.available !== true || value.currency !== 'UAH' || !isCount(value.bookingCount)) {
    throw new ApiError(`Некоректне поле ${field}.`, 0, 'ANALYTICS_CONTRACT')
  }
  if (value.amount !== null && !isMoneyString(value.amount)) {
    throw new ApiError(`Некоректна сума ${field}.`, 0, 'ANALYTICS_CONTRACT')
  }
  return {
    available: true,
    amount: value.amount,
    currency: 'UAH',
    bookingCount: value.bookingCount,
    includesCancelled: value.includesCancelled === true,
  }
}

function parseUnavailable(value: unknown, field: string): AnalyticsUnavailable {
  if (!isRecord(value) || value.available !== false || typeof value.reason !== 'string') {
    throw new ApiError(`Некоректне поле ${field}.`, 0, 'ANALYTICS_CONTRACT')
  }
  if (value.reason !== PAYMENT_LEDGER_UNAVAILABLE) {
    throw new ApiError('Облік оплат не може виглядати як доступний без окремого модуля.', 0, 'ANALYTICS_CONTRACT')
  }
  return { available: false, reason: value.reason }
}

export function parseAdminAnalyticsSummary(value: unknown): AdminAnalyticsSummary {
  if (!isRecord(value)) {
    throw new ApiError('Некоректна відповідь аналітики.', 0, 'ANALYTICS_CONTRACT')
  }
  const period = value.period
  const financial = value.financial
  const bookings = value.bookings
  const cancellations = value.cancellations
  const guests = value.guests
  if (!isRecord(period) || !DATE_PATTERN.test(String(period.from)) || !DATE_PATTERN.test(String(period.to))) {
    throw new ApiError('Некоректний період аналітики.', 0, 'ANALYTICS_CONTRACT')
  }
  if (!isRecord(financial) || !isRecord(bookings) || !isRecord(cancellations) || !isRecord(guests)) {
    throw new ApiError('Некоректні блоки аналітики.', 0, 'ANALYTICS_CONTRACT')
  }
  if (!isRecord(value.definitions)) {
    throw new ApiError('Немає визначень показників.', 0, 'ANALYTICS_CONTRACT')
  }
  const currently = cancellations.currentlyCancelled
  const during = cancellations.cancelledDuringPeriod
  if (!isRecord(currently) || !isRecord(during) || !isCount(currently.count) || !isCount(during.count)) {
    throw new ApiError('Некоректна аналітика скасувань.', 0, 'ANALYTICS_CONTRACT')
  }
  if (!Array.isArray(value.sources) || !Array.isArray(value.accommodations)) {
    throw new ApiError('Некоректні діаграми аналітики.', 0, 'ANALYTICS_CONTRACT')
  }
  const dateType = typeof value.dateType === 'string' && (ANALYTICS_DATE_TYPES as readonly string[]).includes(value.dateType)
    ? (value.dateType as AnalyticsDateType)
    : 'stay'
  return {
    timezone: typeof value.timezone === 'string' && value.timezone.trim() ? value.timezone : HOTEL_TIME_ZONE,
    dateType,
    period: { from: String(period.from), to: String(period.to) },
    definitions: Object.fromEntries(
      Object.entries(value.definitions).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
    ),
    financial: {
      bookingValue: parseMoney(financial.bookingValue, 'bookingValue'),
      revenue: parseUnavailable(financial.revenue, 'revenue'),
      averageCheck: parseMoney(financial.averageCheck, 'averageCheck'),
      outstanding: parseUnavailable(financial.outstanding, 'outstanding'),
      discounts: parseMoney(financial.discounts, 'discounts'),
    },
    bookings: {
      total: isCount(bookings.total) ? bookings.total : fail('bookings.total'),
      cancelled: isCount(bookings.cancelled) ? bookings.cancelled : fail('bookings.cancelled'),
      completed: isCount(bookings.completed) ? bookings.completed : fail('bookings.completed'),
      incomplete: isCount(bookings.incomplete) ? bookings.incomplete : fail('bookings.incomplete'),
    },
    cancellations: {
      currentlyCancelled: {
        count: currently.count,
        amount: isMoneyString(currently.amount) ? currently.amount : fail('currentlyCancelled.amount'),
        currency: 'UAH',
      },
      cancelledDuringPeriod: {
        count: during.count,
        amount: isMoneyString(during.amount) ? during.amount : fail('cancelledDuringPeriod.amount'),
        currency: 'UAH',
      },
    },
    sources: value.sources.map(parseSourceRow),
    accommodations: value.accommodations.map(parseAccommodationRow),
    guests: {
      unique: isCount(guests.unique) ? guests.unique : fail('guests.unique'),
      new: isCount(guests.new) ? guests.new : fail('guests.new'),
      repeatVisits: isCount(guests.repeatVisits) ? guests.repeatVisits : fail('guests.repeatVisits'),
    },
  }
}

function parseSourceRow(value: unknown) {
  if (!isRecord(value) || typeof value.source !== 'string' || typeof value.label !== 'string' || !isCount(value.count)) {
    throw new ApiError('Некоректний рядок джерела.', 0, 'ANALYTICS_CONTRACT')
  }
  return {
    source: value.source,
    label: value.label,
    count: value.count,
    percent: typeof value.percent === 'string' ? value.percent : '0.00',
  }
}

function parseAccommodationRow(value: unknown) {
  if (
    !isRecord(value) ||
    typeof value.roomId !== 'string' ||
    typeof value.name !== 'string' ||
    typeof value.roomTypeName !== 'string' ||
    typeof value.active !== 'boolean' ||
    !isCount(value.count)
  ) {
    throw new ApiError('Некоректний рядок розміщення.', 0, 'ANALYTICS_CONTRACT')
  }
  return {
    roomId: value.roomId,
    name: value.name,
    roomTypeName: value.roomTypeName,
    active: value.active,
    count: value.count,
  }
}

function fail(field: string): never {
  throw new ApiError(`Некоректне поле ${field}.`, 0, 'ANALYTICS_CONTRACT')
}

export function barPercent(count: number, total: number) {
  if (total <= 0 || count <= 0) return '0'
  return String(Math.trunc((count * 100 + Math.trunc(total / 2)) / total))
}

export function analyticsPeriodReady(from: string, to: string) {
  const parsed = parseDashboardPeriod(from, to)
  if (!parsed.ok) return parsed
  if (parsed.days > DASHBOARD_MAX_PERIOD_DAYS) {
    return { ok: false as const, message: `Максимальний період — ${DASHBOARD_MAX_PERIOD_DAYS} днів.` }
  }
  return parsed
}
