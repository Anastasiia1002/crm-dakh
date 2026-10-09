import { format, parseISO } from 'date-fns'
import { uk } from 'date-fns/locale'

function calendarDate(iso: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [year, month, day] = iso.split('-').map(Number)
    return new Date(year, month - 1, day)
  }
  return parseISO(iso)
}

export function formatDate(iso: string) {
  return format(calendarDate(iso), 'd MMM yyyy', { locale: uk })
}

export function formatDateShort(iso: string) {
  return format(calendarDate(iso), 'd MMM', { locale: uk })
}

export function formatWeekday(iso: string) {
  return format(calendarDate(iso), 'EEEEEE', { locale: uk })
}

export function formatDateTime(value: string) {
  const date = /^\d{4}-\d{2}-\d{2}/.test(value) ? parseISO(value) : new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return format(date, 'd MMM yyyy, HH:mm', { locale: uk })
}

export function formatMoney(amount: number) {
  return new Intl.NumberFormat('uk-UA', {
    style: 'currency',
    currency: 'UAH',
    maximumFractionDigits: 0,
  }).format(amount)
}

/** Backend INT_MAX for minStay/maxStay. */
export const STAY_NIGHTS_MAX = 2_147_483_647

/** Format a decimal money string without Number arithmetic. */
export function formatMoneyAmount(amount: string) {
  const normalized = normalizeMoneyString(amount)
  if (!normalized) return `${amount.trim()} ₴`
  const [whole, fraction = '00'] = normalized.split('.')
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0')
  return `${grouped},${fraction}\u00a0₴`
}

/**
 * Canonicalize money to two decimal places as a string.
 * Returns null if invalid — including more than two fractional digits (no silent truncation).
 * Negatives are rejected (backend DTO is non-negative).
 */
export function normalizeMoneyString(amount: string): string | null {
  const trimmed = amount.trim()
  const match = /^(0|[1-9]\d{0,7})(?:\.(\d{1,2}))?$/.exec(trimmed)
  if (!match) return null
  return `${match[1]}.${(match[2] ?? '').padEnd(2, '0')}`
}

/**
 * Canonicalize percent to two decimal places as a string.
 * Returns null if invalid precision, negative, or greater than 100.00.
 */
export function normalizePercentString(amount: string): string | null {
  const trimmed = amount.trim()
  const match = /^(0|[1-9]\d{0,2})(?:\.(\d{1,2}))?$/.exec(trimmed)
  if (!match) return null
  const canonical = `${match[1]}.${(match[2] ?? '').padEnd(2, '0')}`
  if (percentExceedsHundred(canonical)) return null
  return canonical
}

/**
 * Parse a stay-length night count (minStay/maxStay).
 * Requires a strict positive integer string within backend INT bounds.
 * Empty string is not valid here — callers treat blank maxStay as null separately.
 */
export function parseStayNights(value: string): number | null {
  const trimmed = value.trim()
  if (!/^[1-9]\d*$/.test(trimmed)) return null
  const parsed = Number.parseInt(trimmed, 10)
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > STAY_NIGHTS_MAX) return null
  if (String(parsed) !== trimmed) return null
  return parsed
}

/** Format a percent decimal string (no Number arithmetic). */
export function formatPercentAmount(amount: string) {
  const normalized = normalizePercentString(amount)
  if (!normalized) return `${amount.trim()}%`
  const [whole, fraction = '00'] = normalized.split('.')
  return `${whole},${fraction}%`
}

/** True when percent string is strictly greater than 100.00 (string compare). */
export function percentExceedsHundred(value: string): boolean {
  const match = /^(0|[1-9]\d{0,2})(?:\.(\d{1,2}))?$/.exec(value.trim())
  if (!match) return true
  const whole = (match[1] ?? '0').padStart(3, '0')
  const fraction = (match[2] ?? '').padEnd(2, '0')
  return whole > '100' || (whole === '100' && fraction !== '00')
}

export function formatGuests(adults: number, children: number) {
  const adultLabel = adults === 1 ? '1 дорослий' : `${adults} дорослих`
  if (children <= 0) return adultLabel
  const childLabel = children === 1 ? '1 дитина' : `${children} дітей`
  return `${adultLabel}, ${childLabel}`
}

export function guestCount(adults: number, children: number) {
  return adults + children
}

export function formatCount(value: number) {
  return new Intl.NumberFormat('uk-UA').format(value)
}

export function nightsLabel(nights: number) {
  const mod10 = nights % 10
  const mod100 = nights % 100
  if (mod10 === 1 && mod100 !== 11) return `${nights} ніч`
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${nights} ночі`
  return `${nights} ночей`
}
