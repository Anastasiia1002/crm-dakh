import { ApiError } from '@/lib/api-error'
import type { AdminBookingSource, BookingStatus } from '@/types'

const STATUSES: readonly BookingStatus[] = ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW']
const SOURCES: readonly AdminBookingSource[] = ['WEBSITE', 'ADMIN', 'PHONE', 'EMAIL', 'OTHER']
const DATE = /^\d{4}-\d{2}-\d{2}$/
const MONEY = /^(0|[1-9]\d{0,7})(?:\.\d{1,2})?$/

export type AdminGuestListItem = {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  country: string | null
  city: string | null
  bookingsCount: number
  lastCheckIn: string | null
}

export type AdminGuestListPage = {
  items: AdminGuestListItem[]
  page: number
  limit: number
  total: number
  totalPages: number
}

export type AdminGuestIdentity = {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  country: string | null
  city: string | null
  notes: string | null
  createdAt: string
}

export type AdminGuestStats = {
  bookingsCount: number
  lastCheckIn: string | null
  completedStays: number
  totalNights: number
  totalSpent: string
  currency: string
}

export type AdminGuestHistoryRoom = {
  roomId: string
  roomTypeId: string
  ratePlanId: string
  number: string
  roomTypeName: string
  displayLabel: string
}

export type AdminGuestHistoryItem = {
  id: string
  checkIn: string
  checkOut: string
  status: BookingStatus
  source: AdminBookingSource
  adults: number
  children: number
  rooms: AdminGuestHistoryRoom[]
  totalAmount: string
  currency: string
}

export type AdminGuestHistoryPage = {
  items: AdminGuestHistoryItem[]
  page: number
  limit: number
  total: number
  totalPages: number
}

export type AdminGuestProfile = {
  guest: AdminGuestIdentity
  stats: AdminGuestStats
  history: AdminGuestHistoryItem[]
}

export type GuestDirectoryQuery = {
  page: number
  limit: number
  search?: string
}

export type GuestHistoryQuery = {
  page: number
  limit: number
}

export function guestDirectoryPath(query: GuestDirectoryQuery) {
  assertPage(query.page, query.limit)
  const params = new URLSearchParams()
  params.set('page', String(query.page))
  params.set('limit', String(query.limit))
  const search = query.search?.trim()
  if (search) params.set('search', search)
  return `/api/admin/guests?${params.toString()}`
}

export function guestProfilePath(id: string) {
  return `/api/admin/guests/${encodeURIComponent(id)}`
}

export function guestHistoryPath(id: string, query: GuestHistoryQuery) {
  assertPage(query.page, query.limit)
  const params = new URLSearchParams()
  params.set('page', String(query.page))
  params.set('limit', String(query.limit))
  return `/api/admin/guests/${encodeURIComponent(id)}/bookings?${params.toString()}`
}

export function parseGuestDirectoryPage(body: unknown): AdminGuestListPage {
  const record = objectOf(body, 'guest list')
  return {
    items: arrayOf(record.items, 'guest list items').map(parseListItem),
    ...parsePagination(record.pagination),
  }
}

export function parseGuestProfile(body: unknown): AdminGuestProfile {
  const record = objectOf(body, 'guest profile')
  return {
    guest: parseIdentity(record.guest),
    stats: parseStats(record.stats),
    history: arrayOf(record.history, 'guest profile history').map(parseHistoryItem),
  }
}

export function parseGuestHistoryPage(body: unknown): AdminGuestHistoryPage {
  const record = objectOf(body, 'guest history')
  return {
    items: arrayOf(record.items, 'guest history items').map(parseHistoryItem),
    ...parsePagination(record.pagination),
  }
}

/** Join server display labels. Does not rebuild a label from room number or price. */
export function guestStayRoomLabel(rooms: readonly { displayLabel: string }[]) {
  const labels = rooms.map((room) => room.displayLabel.trim()).filter((label) => label.length > 0)
  return labels.length > 0 ? labels.join(', ') : '—'
}

export function guestPlaceLabel(country: string | null, city: string | null) {
  const parts = [country?.trim(), city?.trim()].filter((part): part is string => Boolean(part))
  return parts.length > 0 ? parts.join(', ') : '—'
}

export type GuestFailure = 'unauthorized' | 'forbidden' | 'missing' | 'unavailable'

export function guestFailure(error: unknown): GuestFailure {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'unauthorized'
    if (error.status === 403) return 'forbidden'
    if (error.status === 404) return 'missing'
  }
  return 'unavailable'
}

export function guestFailureMessage(failure: GuestFailure) {
  if (failure === 'unauthorized') return 'Сесія недійсна. Увійдіть знову.'
  if (failure === 'forbidden') return 'Недостатньо прав для перегляду гостей.'
  if (failure === 'missing') return 'Гостя не знайдено.'
  return 'Не вдалося завантажити дані гостей.'
}

function assertPage(page: number, limit: number) {
  if (!Number.isInteger(page) || page < 1) throw new Error('Guest page must be a positive integer')
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error('Guest page limit must be from 1 to 100')
}

function parseListItem(value: unknown): AdminGuestListItem {
  const row = objectOf(value, 'guest')
  return {
    id: text(row.id, 'guest id'),
    firstName: text(row.firstName, 'guest first name'),
    lastName: text(row.lastName, 'guest last name'),
    email: nullableText(row.email, 'guest email'),
    phone: nullableText(row.phone, 'guest phone'),
    country: nullableText(row.country, 'guest country'),
    city: nullableText(row.city, 'guest city'),
    bookingsCount: count(row.bookingsCount, 'bookings count'),
    lastCheckIn: nullableDate(row.lastCheckIn, 'last check-in'),
  }
}

function parseIdentity(value: unknown): AdminGuestIdentity {
  const row = objectOf(value, 'guest identity')
  return {
    id: text(row.id, 'guest id'),
    firstName: text(row.firstName, 'guest first name'),
    lastName: text(row.lastName, 'guest last name'),
    email: nullableText(row.email, 'guest email'),
    phone: nullableText(row.phone, 'guest phone'),
    country: nullableText(row.country, 'guest country'),
    city: nullableText(row.city, 'guest city'),
    notes: nullableText(row.notes, 'guest notes'),
    createdAt: text(row.createdAt, 'guest created at'),
  }
}

function parseStats(value: unknown): AdminGuestStats {
  const row = objectOf(value, 'guest stats')
  return {
    bookingsCount: count(row.bookingsCount, 'bookings count'),
    lastCheckIn: nullableDate(row.lastCheckIn, 'last check-in'),
    completedStays: count(row.completedStays, 'completed stays'),
    totalNights: count(row.totalNights, 'total nights'),
    totalSpent: money(row.totalSpent, 'total spent'),
    currency: text(row.currency, 'currency'),
  }
}

function parseHistoryItem(value: unknown): AdminGuestHistoryItem {
  const row = objectOf(value, 'guest booking')
  const status = text(row.status, 'booking status')
  const source = text(row.source, 'booking source')
  if (!STATUSES.includes(status as BookingStatus)) throw new Error(`Unexpected booking status: ${status}`)
  if (!SOURCES.includes(source as AdminBookingSource)) throw new Error(`Unexpected booking source: ${source}`)
  return {
    id: text(row.id, 'booking id'),
    checkIn: dateText(row.checkIn, 'check-in'),
    checkOut: dateText(row.checkOut, 'check-out'),
    status: status as BookingStatus,
    source: source as AdminBookingSource,
    adults: count(row.adults, 'adults'),
    children: count(row.children, 'children'),
    rooms: arrayOf(row.rooms, 'booking rooms').map(parseRoom),
    totalAmount: money(row.totalAmount, 'total amount'),
    currency: text(row.currency, 'currency'),
  }
}

function parseRoom(value: unknown): AdminGuestHistoryRoom {
  const row = objectOf(value, 'booking room')
  return {
    roomId: text(row.roomId, 'room id'),
    roomTypeId: text(row.roomTypeId, 'room type id'),
    ratePlanId: text(row.ratePlanId, 'rate plan id'),
    number: text(row.number, 'room number'),
    roomTypeName: text(row.roomTypeName, 'room type name'),
    displayLabel: text(row.displayLabel, 'room display label'),
  }
}

function parsePagination(value: unknown) {
  const row = objectOf(value, 'pagination')
  return {
    page: countAtLeast(row.page, 1, 'page'),
    limit: countAtLeast(row.limit, 1, 'limit'),
    total: count(row.total, 'total'),
    totalPages: count(row.totalPages, 'total pages'),
  }
}

function objectOf(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Invalid ${label}`)
  return value as Record<string, unknown>
}

function arrayOf(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`Invalid ${label}`)
  return value
}

function text(value: unknown, label: string) {
  if (typeof value !== 'string' || value.trim().length === 0) throw new Error(`Invalid ${label}`)
  return value
}

function nullableText(value: unknown, label: string) {
  if (value === null) return null
  if (typeof value !== 'string') throw new Error(`Invalid ${label}`)
  const trimmed = value.trim()
  return trimmed.length > 0 ? value : null
}

function dateText(value: unknown, label: string) {
  const raw = text(value, label)
  if (!DATE.test(raw)) throw new Error(`Invalid ${label}`)
  return raw
}

function nullableDate(value: unknown, label: string) {
  if (value === null) return null
  return dateText(value, label)
}

function count(value: unknown, label: string) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) throw new Error(`Invalid ${label}`)
  return value
}

function countAtLeast(value: unknown, min: number, label: string) {
  const parsed = count(value, label)
  if (parsed < min) throw new Error(`Invalid ${label}`)
  return parsed
}

function money(value: unknown, label: string) {
  const raw = text(value, label)
  if (!MONEY.test(raw)) throw new Error(`Invalid ${label}`)
  return raw
}
