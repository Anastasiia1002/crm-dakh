import { format, parseISO } from 'date-fns'
import { uk } from 'date-fns/locale'

export function formatDate(iso: string) {
  return format(parseISO(iso), 'd MMM yyyy', { locale: uk })
}

export function formatDateShort(iso: string) {
  return format(parseISO(iso), 'd MMM', { locale: uk })
}

export function formatWeekday(iso: string) {
  return format(parseISO(iso), 'EEEEEE', { locale: uk })
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
