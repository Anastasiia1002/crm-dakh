import { quoteStay } from '@/lib/pricing'
import { nightsBetween } from '@/lib/dates'
import { ApiError, delay } from '@/mocks/delay'
import * as db from '@/mocks/db'
import { findBlockConflict, findBookingConflict, availableRoomCount, occupiedUnitCount } from '@/mocks/inventory'
import { getActorId } from '@/mocks/session'
import type { Booking, BookingFilters, BookingStatus, BookingWriteInput, DashboardSummary, Guest, PaymentMethod, PaymentStatus } from '@/types'

function clone<T>(value: T): T {
  return structuredClone(value)
}

function guestName(guest: Guest) {
  return `${guest.firstName} ${guest.lastName}`
}

function resolvePromo(code: string | null, checkIn: string) {
  if (!code) return null
  const promo = db.promoCodes.find((item) => item.code.toLowerCase() === code.trim().toLowerCase())
  if (!promo || !promo.active) throw new ApiError('Промокод недійсний')
  if (checkIn < promo.validFrom || checkIn > promo.validTo) throw new ApiError('Промокод не діє на ці дати')
  if (promo.usageLimit !== null && promo.usedCount >= promo.usageLimit) {
    throw new ApiError('Ліміт використання промокоду вичерпано')
  }
  return promo
}

function buildQuote(input: BookingWriteInput, roomTypeId: string, promoCode: string | null) {
  const roomType = db.roomTypes.find((item) => item.id === roomTypeId)
  if (!roomType) throw new ApiError('Категорію не знайдено')
  const promo = resolvePromo(promoCode, input.checkIn)
  return {
    promo,
    roomType,
    quote: quoteStay({
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      ratePlanId: input.ratePlanId,
      roomTypeId,
      basePrice: roomType.basePrice,
      periods: db.pricePeriods,
      services: db.services,
      serviceIds: input.serviceIds,
      adults: input.adults,
      children: input.children,
      promo,
    }),
  }
}

function assertStay(input: BookingWriteInput, excludeId?: string) {
  if (!input.checkIn || !input.checkOut) throw new ApiError('Вкажіть дати проживання')
  const nights = nightsBetween(input.checkIn, input.checkOut)
  if (nights < db.settings.minNights) throw new ApiError(`Мінімальне проживання — ${db.settings.minNights} ніч`)
  if (nights > db.settings.maxNights) throw new ApiError(`Максимальне проживання — ${db.settings.maxNights} ночей`)
  const accommodation = db.accommodations.find((item) => item.id === input.accommodationId)
  if (!accommodation) throw new ApiError('Оберіть номер або будиночок')
  const roomType = db.roomTypes.find((item) => item.id === accommodation.roomTypeId)
  if (!roomType) throw new ApiError('Категорію не знайдено')
  if (input.adults + input.children > roomType.capacity) {
    throw new ApiError(`Місткість цього розміщення — ${roomType.capacity}`)
  }
  if (!db.ratePlans.some((item) => item.id === input.ratePlanId && item.active)) {
    throw new ApiError('Оберіть активний тариф')
  }
  if (findBookingConflict(input.accommodationId, input.checkIn, input.checkOut, excludeId)) {
    throw new ApiError('На ці дати розміщення вже зайняте')
  }
  if (findBlockConflict(input.accommodationId, input.checkIn, input.checkOut)) {
    throw new ApiError('Обʼєкт заблоковано на обрані дати')
  }
  return accommodation
}

function resolveGuest(input: BookingWriteInput, previousGuestId?: string) {
  if (input.newGuest) {
    const guest: Guest = {
      id: db.uid('gst'),
      firstName: input.newGuest.firstName.trim(),
      lastName: input.newGuest.lastName.trim(),
      phone: input.newGuest.phone.trim(),
      email: input.newGuest.email.trim(),
      country: '',
      city: '',
      notes: '',
      createdAt: new Date().toISOString(),
    }
    if (!guest.firstName || !guest.lastName || !guest.phone) {
      throw new ApiError('Заповніть імʼя, прізвище і телефон гостя')
    }
    db.guests.unshift(guest)
    return guest
  }
  const guestId = input.guestId || previousGuestId
  const guest = db.guests.find((item) => item.id === guestId)
  if (!guest) throw new ApiError('Оберіть гостя')
  return guest
}

export async function getGuests() {
  await delay()
  return clone(db.guests)
}

export async function getBookings(filters: BookingFilters = {}) {
  await delay()
  const search = filters.search?.trim().toLowerCase() ?? ''
  const result = db.bookings.filter((booking) => {
    if (filters.status && filters.status !== 'all' && booking.status !== filters.status) return false
    if (filters.accommodationId && filters.accommodationId !== 'all' && booking.accommodationId !== filters.accommodationId) {
      return false
    }
    if (filters.source && filters.source !== 'all' && booking.source !== filters.source) return false
    if (filters.dateFrom && booking.checkIn < filters.dateFrom) return false
    if (filters.dateTo && booking.checkIn > filters.dateTo) return false
    if (!search) return true
    const guest = db.guests.find((item) => item.id === booking.guestId)
    const haystack = [booking.number, guest?.firstName, guest?.lastName, guest?.phone, guest?.email]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return haystack.includes(search)
  })
  result.sort((a, b) => b.checkIn.localeCompare(a.checkIn) || b.number.localeCompare(a.number))
  return clone(result)
}

export async function getBooking(id: string) {
  await delay()
  const booking = db.bookings.find((item) => item.id === id)
  if (!booking) throw new ApiError('Бронювання не знайдено')
  return clone(booking)
}

export async function createBooking(input: BookingWriteInput) {
  await delay()
  const accommodation = assertStay(input)
  const guest = resolveGuest(input)
  const { quote, promo } = buildQuote(input, accommodation.roomTypeId, input.promoCode)
  if (promo) promo.usedCount += 1
  const now = new Date().toISOString()
  const booking: Booking = {
    id: db.uid('bkg'),
    number: db.nextBookingNumber(),
    guestId: guest.id,
    accommodationId: input.accommodationId,
    ratePlanId: input.ratePlanId,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    checkInTime: input.checkInTime || db.settings.checkInTime,
    checkOutTime: db.settings.checkOutTime,
    adults: input.adults,
    children: input.children,
    status: input.status,
    source: input.source,
    serviceIds: input.serviceIds,
    promoCodeId: quote.promoCodeId,
    accommodationAmount: quote.accommodationAmount,
    servicesAmount: quote.servicesAmount,
    discountAmount: quote.discountAmount,
    totalAmount: quote.totalAmount,
    paymentStatus: input.paymentStatus,
    paymentMethod: input.paymentMethod,
    notes: input.notes.trim(),
    cancelReason: null,
    createdAt: now,
    updatedAt: now,
  }
  db.bookings.unshift(booking)
  db.addAudit({
    actorId: getActorId(),
    action: 'Створено бронювання',
    entity: 'booking',
    entityId: booking.id,
    details: `${booking.number} · ${guestName(guest)} · ${accommodation.name}`,
  })
  return clone(booking)
}

export async function updateBooking(id: string, input: BookingWriteInput) {
  await delay()
  const current = db.bookings.find((item) => item.id === id)
  if (!current) throw new ApiError('Бронювання не знайдено')
  if (current.status === 'CANCELLED' || current.status === 'CHECKED_OUT' || current.status === 'NO_SHOW') {
    throw new ApiError('Це бронювання вже закрите')
  }
  const accommodation = assertStay(input, id)
  const guest = resolveGuest(input, current.guestId)
  const { quote, promo } = buildQuote(input, accommodation.roomTypeId, input.promoCode)
  if (promo && promo.id !== current.promoCodeId) promo.usedCount += 1
  if (current.promoCodeId && current.promoCodeId !== quote.promoCodeId) {
    const previous = db.promoCodes.find((item) => item.id === current.promoCodeId)
    if (previous) previous.usedCount = Math.max(0, previous.usedCount - 1)
  }
  Object.assign(current, {
    guestId: guest.id,
    accommodationId: input.accommodationId,
    ratePlanId: input.ratePlanId,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    checkInTime: input.checkInTime || current.checkInTime,
    adults: input.adults,
    children: input.children,
    status: current.status === 'CHECKED_IN' ? 'CHECKED_IN' : input.status,
    source: input.source,
    serviceIds: input.serviceIds,
    promoCodeId: quote.promoCodeId,
    accommodationAmount: quote.accommodationAmount,
    servicesAmount: quote.servicesAmount,
    discountAmount: quote.discountAmount,
    totalAmount: quote.totalAmount,
    paymentStatus: input.paymentStatus,
    paymentMethod: input.paymentMethod,
    notes: input.notes.trim(),
    updatedAt: new Date().toISOString(),
  })
  db.addAudit({
    actorId: getActorId(),
    action: 'Оновлено бронювання',
    entity: 'booking',
    entityId: current.id,
    details: `${current.number} · ${guestName(guest)} · ${accommodation.name}`,
  })
  return clone(current)
}

export async function setBookingStatus(id: string, status: BookingStatus, cancelReason?: string) {
  await delay()
  const booking = db.bookings.find((item) => item.id === id)
  if (!booking) throw new ApiError('Бронювання не знайдено')
  const allowed: Partial<Record<BookingStatus, BookingStatus[]>> = {
    PENDING: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['CHECKED_IN', 'NO_SHOW', 'CANCELLED'],
    CHECKED_IN: ['CHECKED_OUT'],
  }
  if (!allowed[booking.status]?.includes(status)) {
    throw new ApiError('Цю дію неможливо виконати для поточного статусу')
  }
  booking.status = status
  booking.updatedAt = new Date().toISOString()
  if (status === 'CANCELLED') {
    booking.cancelReason = cancelReason?.trim() || null
    if (booking.paymentStatus === 'paid' || booking.paymentStatus === 'deposit') {
      booking.paymentStatus = 'refunded'
    }
  }
  const guest = db.guests.find((item) => item.id === booking.guestId)
  const labels: Partial<Record<BookingStatus, string>> = {
    CONFIRMED: 'Підтверджено',
    CHECKED_IN: 'Заселено',
    CHECKED_OUT: 'Виселено',
    CANCELLED: 'Скасовано',
    NO_SHOW: 'Позначено як не заїхав',
  }
  db.addAudit({
    actorId: getActorId(),
    action: labels[status] ?? 'Змінено статус',
    entity: 'booking',
    entityId: booking.id,
    details: `${booking.number}${guest ? ` · ${guestName(guest)}` : ''}`,
  })
  return clone(booking)
}

export async function updatePayment(id: string, paymentStatus: PaymentStatus, paymentMethod: PaymentMethod | null) {
  await delay()
  const booking = db.bookings.find((item) => item.id === id)
  if (!booking) throw new ApiError('Бронювання не знайдено')
  if (paymentMethod === 'online') throw new ApiError('Онлайн-оплата ще не підключена')
  booking.paymentStatus = paymentStatus
  booking.paymentMethod = paymentStatus === 'unpaid' ? null : paymentMethod
  booking.updatedAt = new Date().toISOString()
  db.addAudit({
    actorId: getActorId(),
    action: 'Оновлено оплату',
    entity: 'booking',
    entityId: booking.id,
    details: `${booking.number}`,
  })
  return clone(booking)
}

export async function getDashboard(): Promise<DashboardSummary> {
  await delay()
  const today = new Date()
  const date = `${today.getFullYear()}-${`${today.getMonth() + 1}`.padStart(2, '0')}-${`${today.getDate()}`.padStart(2, '0')}`
  const active = db.bookings.filter((item) => item.status !== 'CANCELLED' && item.status !== 'NO_SHOW')
  const arrivals = active
    .filter((item) => item.checkIn === date && (item.status === 'PENDING' || item.status === 'CONFIRMED' || item.status === 'CHECKED_IN'))
    .sort((a, b) => a.checkInTime.localeCompare(b.checkInTime))
  const departures = db.bookings
    .filter((item) => item.checkOut === date && item.status === 'CHECKED_IN')
    .sort((a, b) => a.checkOutTime.localeCompare(b.checkOutTime))
  const inHouse = db.bookings.filter((item) => item.status === 'CHECKED_IN')
  const upcoming = db.bookings
    .filter((item) => item.checkIn >= date && (item.status === 'PENDING' || item.status === 'CONFIRMED' || item.status === 'CHECKED_IN'))
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn) || a.checkInTime.localeCompare(b.checkInTime))
    .slice(0, 8)
  const guestsInHouse = inHouse.reduce((sum, item) => sum + item.adults + item.children, 0)
  const occupancyPercent = Math.round((occupiedUnitCount(date) / db.accommodations.length) * 100)
  return {
    arrivalsToday: arrivals.length,
    departuresToday: departures.length,
    guestsInHouse,
    availableRooms: availableRoomCount(date),
    occupancyPercent,
    arrivals: clone(arrivals),
    departures: clone(departures),
    upcoming: clone(upcoming),
    pendingCount: db.bookings.filter((item) => item.status === 'PENDING').length,
  }
}
