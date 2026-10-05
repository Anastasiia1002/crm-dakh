import { addDays, format, parseISO } from 'date-fns'
import { nightsBetween, todayIso } from '@/lib/dates'
import { ApiError, delay } from '@/mocks/delay'
import * as db from '@/mocks/db'
import { getActorId } from '@/mocks/session'
import type {
  Booking,
  Guest,
  GuestFilters,
  GuestImportResult,
  GuestListItem,
  GuestListResult,
  GuestProfile,
  GuestStats,
  GuestStatus,
  GuestWriteInput,
} from '@/types'

const KNOWN_COUNTRIES = ['Україна', 'Румунія', 'Польща', 'Німеччина'] as const
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function clone<T>(value: T): T {
  return structuredClone(value)
}

function shiftIso(days: number) {
  return format(addDays(parseISO(todayIso()), days), 'yyyy-MM-dd')
}

function guestBookings(guestId: string) {
  return db.bookings.filter((booking) => booking.guestId === guestId)
}

function countsTowardStay(booking: Booking) {
  return booking.status !== 'CANCELLED' && booking.status !== 'NO_SHOW'
}

function statsFor(guestId: string): GuestStats {
  const list = guestBookings(guestId)
  const counted = list.filter(countsTowardStay)
  const lastBookingDate = list.map((booking) => booking.checkIn).sort().at(-1) ?? null
  return {
    bookingsCount: list.length,
    completedStays: list.filter((booking) => booking.status === 'CHECKED_OUT').length,
    totalNights: counted.reduce((sum, booking) => sum + Math.max(0, nightsBetween(booking.checkIn, booking.checkOut)), 0),
    totalSpent: counted.reduce((sum, booking) => sum + booking.totalAmount, 0),
    lastBookingDate,
  }
}

function guestStatus(bookingsCount: number): GuestStatus {
  return bookingsCount >= 2 ? 'regular' : 'new'
}

function toListItem(guest: Guest): GuestListItem {
  const stats = statsFor(guest.id)
  return { ...guest, ...stats, status: guestStatus(stats.bookingsCount) }
}

function matchesFilters(item: GuestListItem, filters: GuestFilters) {
  const search = filters.search?.trim().toLowerCase() ?? ''
  if (search) {
    const haystack = [item.firstName, item.lastName, item.phone, item.email].join(' ').toLowerCase()
    if (!haystack.includes(search)) return false
  }
  if (filters.country && filters.country !== 'all') {
    if (filters.country === 'other') {
      if (KNOWN_COUNTRIES.includes(item.country as (typeof KNOWN_COUNTRIES)[number])) return false
    } else if (item.country !== filters.country) return false
  }
  if (filters.status && filters.status !== 'all' && item.status !== filters.status) return false
  if (filters.bookings === '1' && item.bookingsCount !== 1) return false
  if (filters.bookings === '2-5' && (item.bookingsCount < 2 || item.bookingsCount > 5)) return false
  if (filters.bookings === '6+' && item.bookingsCount < 6) return false
  if (filters.lastBooking && filters.lastBooking !== 'any') {
    if (!item.lastBookingDate) return false
    const from =
      filters.lastBooking === '30d' ? shiftIso(-30) : filters.lastBooking === '3m' ? shiftIso(-90) : shiftIso(-365)
    if (item.lastBookingDate < from) return false
  }
  return true
}

function summaryOf(items: GuestListItem[]) {
  const border = shiftIso(-30)
  return {
    totalGuests: items.length,
    newGuests: items.filter((item) => item.createdAt.slice(0, 10) >= border).length,
    withBookings: items.filter((item) => item.bookingsCount > 0).length,
    returningGuests: items.filter((item) => item.bookingsCount >= 2).length,
  }
}

function filteredItems(filters: GuestFilters) {
  return db.guests
    .map(toListItem)
    .filter((item) => matchesFilters(item, filters))
    .sort((a, b) => a.lastName.localeCompare(b.lastName, 'uk') || a.firstName.localeCompare(b.firstName, 'uk'))
}

export async function listGuests(filters: GuestFilters = {}): Promise<GuestListResult> {
  await delay()
  const all = db.guests.map(toListItem)
  const matched = filteredItems(filters)
  const pageSize = filters.pageSize && filters.pageSize > 0 ? filters.pageSize : 10
  const pageCount = Math.max(1, Math.ceil(matched.length / pageSize))
  const page = Math.min(Math.max(filters.page ?? 1, 1), pageCount)
  const start = (page - 1) * pageSize
  return {
    items: clone(matched.slice(start, start + pageSize)),
    total: matched.length,
    page,
    pageSize,
    summary: summaryOf(all),
  }
}

export async function listGuestsForExport(filters: GuestFilters = {}) {
  await delay(40)
  return clone(filteredItems(filters))
}

export async function getGuestProfile(id: string): Promise<GuestProfile> {
  await delay()
  const guest = db.guests.find((item) => item.id === id)
  if (!guest) throw new ApiError('Гостя не знайдено')
  const history = guestBookings(id)
    .map((booking) => ({
      id: booking.id,
      number: booking.number,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      accommodationName: db.accommodations.find((item) => item.id === booking.accommodationId)?.name ?? '—',
      ratePlanName: db.ratePlans.find((item) => item.id === booking.ratePlanId)?.name ?? '—',
      adults: booking.adults,
      children: booking.children,
      status: booking.status,
      totalAmount: booking.totalAmount,
    }))
    .sort((a, b) => b.checkIn.localeCompare(a.checkIn))
  return clone({ guest, stats: statsFor(id), history })
}

export async function saveGuest(input: GuestWriteInput) {
  await delay()
  const firstName = input.firstName.trim()
  const lastName = input.lastName.trim()
  const email = input.email.trim()
  if (!firstName) throw new ApiError('Вкажіть імʼя')
  if (!lastName) throw new ApiError('Вкажіть прізвище')
  if (email && !EMAIL_PATTERN.test(email)) throw new ApiError('Вкажіть коректну електронну пошту')
  if (input.id) {
    const current = db.guests.find((item) => item.id === input.id)
    if (!current) throw new ApiError('Гостя не знайдено')
    Object.assign(current, {
      firstName,
      lastName,
      email,
      phone: input.phone.trim(),
      country: input.country.trim(),
      city: input.city.trim(),
      notes: input.notes.trim(),
    })
    db.addAudit({
      actorId: getActorId(),
      action: 'Оновлено гостя',
      entity: 'guest',
      entityId: current.id,
      details: `${current.firstName} ${current.lastName}`,
    })
    return clone(current)
  }
  const created: Guest = {
    id: db.uid('gst'),
    firstName,
    lastName,
    email,
    phone: input.phone.trim(),
    country: input.country.trim(),
    city: input.city.trim(),
    notes: input.notes.trim(),
    createdAt: new Date().toISOString(),
  }
  db.guests.unshift(created)
  db.addAudit({
    actorId: getActorId(),
    action: 'Створено гостя',
    entity: 'guest',
    entityId: created.id,
    details: `${created.firstName} ${created.lastName}`,
  })
  return clone(created)
}

function csvDelimiter(headerLine: string) {
  const commas = headerLine.split(',').length
  const semicolons = headerLine.split(';').length
  return semicolons > commas ? ';' : ','
}

function splitCsvLine(line: string, delimiter: string) {
  const cells: string[] = []
  let current = ''
  let quoted = false
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"'
        index += 1
      } else quoted = !quoted
    } else if (char === delimiter && !quoted) {
      cells.push(current.trim())
      current = ''
    } else current += char
  }
  cells.push(current.trim())
  return cells
}

function columnIndex(header: string[], names: string[]) {
  const normalized = header.map((cell) => cell.replace(/['’ʼ]/g, '').toLowerCase())
  const wanted = names.map((name) => name.replace(/['’ʼ]/g, '').toLowerCase())
  return normalized.findIndex((cell) => wanted.includes(cell))
}

export async function importGuestFile(input: { name: string; text: string | null }): Promise<GuestImportResult> {
  await delay()
  const lower = input.name.toLowerCase()
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
    return {
      totalRows: 100,
      created: 72,
      existing: 23,
      skipped: 5,
      errors: [
        { row: 14, message: 'Некоректний email' },
        { row: 27, message: 'Не вказано імʼя' },
      ],
    }
  }
  const lines = (input.text ?? '')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (lines.length === 0) throw new ApiError('Файл порожній')
  const delimiter = csvDelimiter(lines[0])
  const header = splitCsvLine(lines[0], delimiter)
  const columns = {
    firstName: columnIndex(header, ['Імʼя', "Ім'я"]),
    lastName: columnIndex(header, ['Прізвище']),
    email: columnIndex(header, ['Email']),
    phone: columnIndex(header, ['Телефон']),
    country: columnIndex(header, ['Країна']),
    city: columnIndex(header, ['Місто']),
    notes: columnIndex(header, ['Примітки']),
  }
  if (columns.firstName < 0 || columns.lastName < 0) {
    throw new ApiError('У файлі немає колонок «Імʼя» та «Прізвище»')
  }
  const result: GuestImportResult = { totalRows: 0, created: 0, existing: 0, skipped: 0, errors: [] }
  lines.slice(1).forEach((line, offset) => {
    const row = offset + 2
    result.totalRows += 1
    const cells = splitCsvLine(line, delimiter)
    const read = (index: number) => (index >= 0 ? (cells[index] ?? '').trim() : '')
    const firstName = read(columns.firstName)
    const email = read(columns.email)
    if (!firstName) {
      result.skipped += 1
      result.errors.push({ row, message: 'Не вказано імʼя' })
      return
    }
    if (!read(columns.lastName)) {
      result.skipped += 1
      result.errors.push({ row, message: 'Не вказано прізвище' })
      return
    }
    if (email && !EMAIL_PATTERN.test(email)) {
      result.skipped += 1
      result.errors.push({ row, message: 'Некоректний email' })
      return
    }
    const phone = read(columns.phone)
    const existing = db.guests.find((item) => {
      if (email && item.email.toLowerCase() === email.toLowerCase()) return true
      return Boolean(phone) && item.phone.replace(/\s/g, '') === phone.replace(/\s/g, '')
    })
    if (existing) {
      result.existing += 1
      return
    }
    db.guests.unshift({
      id: db.uid('gst'),
      firstName,
      lastName: read(columns.lastName),
      email,
      phone,
      country: read(columns.country),
      city: read(columns.city),
      notes: read(columns.notes),
      createdAt: new Date().toISOString(),
    })
    result.created += 1
  })
  db.addAudit({
    actorId: getActorId(),
    action: 'Імпортовано гостей',
    entity: 'guest',
    entityId: 'import',
    details: `${input.name}: додано ${result.created}`,
  })
  return result
}
