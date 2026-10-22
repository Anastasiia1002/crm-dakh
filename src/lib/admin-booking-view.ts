import { formatMoneyAmount } from '@/lib/format'
import type {
  AdminBookingCreateInput,
  AdminBookingDetail,
  AdminBookingGuest,
  AdminBookingGuestInput,
  AdminBookingListFilters,
  AdminBookingListItem,
  AdminBookingListQuery,
  AdminBookingRoom,
  AdminBookingStatusAction,
  AdminBookingUpdateInput,
  BookingStatus,
  UserRole,
} from '@/types'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const STATUS_ACTIONS: Record<BookingStatus, readonly AdminBookingStatusAction[]> = {
  PENDING: ['confirm', 'cancel'],
  CONFIRMED: ['check-in', 'no-show', 'cancel'],
  CHECKED_IN: ['check-out'],
  CHECKED_OUT: [],
  CANCELLED: [],
  NO_SHOW: [],
}

/** Short display id — backend has no booking number field. */
export function adminBookingRef(id: string) {
  const trimmed = id.trim()
  if (trimmed.length <= 8) return trimmed
  return trimmed.slice(0, 8)
}

export function adminGuestName(guest: AdminBookingGuest) {
  const first = guest.firstName?.trim() ?? ''
  const last = guest.lastName?.trim() ?? ''
  const full = `${first} ${last}`.trim()
  return full || '—'
}

export function adminRoomsLabel(rooms: readonly AdminBookingRoom[]) {
  if (rooms.length === 0) return '—'
  return rooms
    .map((room) => {
      const number = room.number?.trim() || '—'
      const type = room.roomTypeName?.trim()
      return type ? `${number} · ${type}` : number
    })
    .join(', ')
}

export function formatAdminBookingMoney(amount: string, currency: string) {
  if (currency === 'UAH') return formatMoneyAmount(amount)
  const normalized = amount.trim() || '0.00'
  return `${normalized} ${currency}`
}

export function isAdminBookingTerminal(status: AdminBookingListItem['status']) {
  return status === 'CHECKED_OUT' || status === 'CANCELLED' || status === 'NO_SHOW'
}

/**
 * Map UI filters to backend list query.
 * Date overlap requires both checkIn and checkOut (backend validation).
 */
export function toAdminBookingListQuery(filters: AdminBookingListFilters): AdminBookingListQuery {
  const query: AdminBookingListQuery = {
    page: filters.page,
    limit: filters.limit,
  }
  const search = filters.search.trim()
  if (search) query.search = search
  if (filters.status !== 'all') query.status = filters.status
  if (filters.source !== 'all') query.source = filters.source
  if (filters.roomId !== 'all') query.roomId = filters.roomId
  if (filters.checkIn && filters.checkOut) {
    query.checkIn = filters.checkIn
    query.checkOut = filters.checkOut
  }
  return query
}

export function adminBookingDateFilterReady(checkIn: string, checkOut: string) {
  if (!checkIn && !checkOut) return { ok: true as const, partial: false }
  if (checkIn && checkOut) {
    if (checkOut <= checkIn) {
      return { ok: false as const, partial: false, message: 'Дата «до» має бути пізніше за «від».' }
    }
    return { ok: true as const, partial: false }
  }
  return {
    ok: false as const,
    partial: true,
    message: 'Для фільтра за датами вкажіть обидві межі періоду (перетин проживання).',
  }
}

/** Lightweight shape checks for list items used by the table. */
export function assertAdminBookingListItem(item: AdminBookingListItem): string[] {
  const issues: string[] = []
  if (!item.id) issues.push('id')
  if (!item.guest?.id) issues.push('guest.id')
  if (!Array.isArray(item.rooms)) issues.push('rooms')
  if (typeof item.totalAmount !== 'string') issues.push('totalAmount')
  if (typeof item.currency !== 'string') issues.push('currency')
  return issues
}

export function assertAdminBookingDetail(item: AdminBookingDetail): string[] {
  const issues = assertAdminBookingListItem(item)
  if (!Array.isArray(item.nights)) issues.push('nights')
  if (!Array.isArray(item.services)) issues.push('services')
  if (!item.price || typeof item.price.totalAmount !== 'string') issues.push('price.totalAmount')
  return issues
}

export function isValidStayDate(value: string) {
  return DATE_PATTERN.test(value)
}

export function canEditAdminBookingCommercial(status: BookingStatus) {
  return status === 'PENDING' || status === 'CONFIRMED'
}

export function canEditAdminBookingProfile(status: BookingStatus) {
  return canEditAdminBookingCommercial(status) || status === 'CHECKED_IN'
}

export function canReassignAdminBookingRoom(role: UserRole | undefined) {
  return role === 'owner' || role === 'admin' || role === 'manager'
}

export function adminBookingStatusActions(status: BookingStatus): AdminBookingStatusAction[] {
  return [...STATUS_ACTIONS[status]]
}

export function validateStayDates(checkIn: string, checkOut: string): string | null {
  if (!isValidStayDate(checkIn) || !isValidStayDate(checkOut)) {
    return 'Дати мають бути у форматі YYYY-MM-DD.'
  }
  if (checkOut <= checkIn) return 'Виїзд має бути пізніше заїзду.'
  return null
}

export function guestCountFromOccupancy(adults: number, children: number) {
  const total = Math.max(0, adults) + Math.max(0, children)
  return Math.max(1, total)
}

/** Build create body: guestId XOR guest; no prices/services/promo. */
export function buildAdminBookingCreateInput(input: {
  guestMode: 'existing' | 'new'
  guestId: string
  guest: AdminBookingGuestInput
  checkIn: string
  checkOut: string
  adults: number
  children: number
  roomId: string
  ratePlanId: string
  notes?: string
  promoCodeId?: string | null
}): AdminBookingCreateInput | { error: string } {
  const dateError = validateStayDates(input.checkIn, input.checkOut)
  if (dateError) return { error: dateError }
  if (!input.roomId || !input.ratePlanId) return { error: 'Оберіть номер і тариф.' }
  if (input.adults < 1) return { error: 'Потрібен хоча б один дорослий.' }
  if (input.children < 0) return { error: 'Кількість дітей некоректна.' }

  const body: AdminBookingCreateInput = {
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    adults: input.adults,
    children: input.children,
    guestCount: guestCountFromOccupancy(input.adults, input.children),
    source: 'ADMIN',
    status: 'CONFIRMED',
    rooms: [{ roomId: input.roomId, ratePlanId: input.ratePlanId }],
  }
  const notes = input.notes?.trim()
  if (notes) body.notes = notes
  if (input.promoCodeId) body.promoCodeId = input.promoCodeId

  if (input.guestMode === 'existing') {
    if (!input.guestId) return { error: 'Оберіть гостя.' }
    body.guestId = input.guestId
    return body
  }

  const firstName = input.guest.firstName.trim()
  const lastName = input.guest.lastName.trim()
  const phone = input.guest.phone?.trim() ?? ''
  const email = input.guest.email?.trim() ?? ''
  if (!firstName || !lastName) return { error: 'Вкажіть імʼя та прізвище гостя.' }
  if (phone.length < 10) return { error: 'Вкажіть телефон гостя.' }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Вкажіть коректну електронну пошту.' }
  }
  body.guest = {
    firstName,
    lastName,
    phone,
    ...(email ? { email } : {}),
  }
  return body
}

export function buildAdminBookingUpdateInput(input: {
  booking: AdminBookingDetail
  role: UserRole | undefined
  guestMode: 'existing' | 'new' | 'keep'
  guestId: string
  guest: AdminBookingGuestInput
  checkIn: string
  checkOut: string
  adults: number
  children: number
  roomId: string
  ratePlanId: string
  notes: string
  promoCodeId?: string | null
}): AdminBookingUpdateInput | { error: string } {
  const { booking, role } = input
  if (isAdminBookingTerminal(booking.status)) {
    return { error: 'Термінальне бронювання не можна редагувати.' }
  }

  const patch: AdminBookingUpdateInput = {}
  const commercial = canEditAdminBookingCommercial(booking.status)
  const profile = canEditAdminBookingProfile(booking.status)

  if (commercial) {
    const dateError = validateStayDates(input.checkIn, input.checkOut)
    if (dateError) return { error: dateError }
    if (input.checkIn !== booking.checkIn) patch.checkIn = input.checkIn
    if (input.checkOut !== booking.checkOut) patch.checkOut = input.checkOut
    if (input.adults !== booking.adults) patch.adults = input.adults
    if (input.children !== booking.children) patch.children = input.children
    const guestCount = guestCountFromOccupancy(input.adults, input.children)
    if (guestCount !== booking.guestCount) patch.guestCount = guestCount
    if (input.promoCodeId !== undefined && input.promoCodeId !== booking.promoCodeId) {
      patch.promoCodeId = input.promoCodeId
    }

    const currentRoom = booking.rooms[0]
    const roomsChanged =
      !currentRoom ||
      currentRoom.roomId !== input.roomId ||
      currentRoom.ratePlanId !== input.ratePlanId ||
      booking.rooms.length !== 1
    if (roomsChanged) {
      if (!canReassignAdminBookingRoom(role)) {
        return { error: 'Недостатньо прав для зміни номера.' }
      }
      if (!input.roomId || !input.ratePlanId) return { error: 'Оберіть номер і тариф.' }
      patch.rooms = [{ roomId: input.roomId, ratePlanId: input.ratePlanId }]
    }
  }

  if (profile) {
    const notes = input.notes.trim()
    const previousNotes = booking.notes?.trim() ?? ''
    if (notes !== previousNotes) patch.notes = notes.length > 0 ? notes : null

    if (input.guestMode === 'existing' && input.guestId && input.guestId !== booking.guest.id) {
      patch.guestId = input.guestId
    } else if (input.guestMode === 'new' || input.guestMode === 'keep') {
      const firstName = input.guest.firstName.trim()
      const lastName = input.guest.lastName.trim()
      const phone = input.guest.phone?.trim() ? input.guest.phone.trim() : null
      const email = input.guest.email?.trim() ? input.guest.email.trim() : null
      if (!firstName || !lastName) return { error: 'Вкажіть імʼя та прізвище гостя.' }
      const guestPatch: {
        firstName?: string
        lastName?: string
        phone?: string | null
        email?: string | null
      } = {}
      if (firstName !== booking.guest.firstName) guestPatch.firstName = firstName
      if (lastName !== booking.guest.lastName) guestPatch.lastName = lastName
      if (phone !== booking.guest.phone) guestPatch.phone = phone
      if (email !== booking.guest.email) guestPatch.email = email
      if (Object.keys(guestPatch).length > 0) patch.guest = guestPatch
    }
  }

  if (Object.keys(patch).length === 0) return { error: 'Немає змін для збереження.' }
  if (!commercial && Object.keys(patch).every((key) => key === 'guest' || key === 'guestId' || key === 'notes')) {
    return patch
  }
  if (!commercial && (patch.checkIn || patch.checkOut || patch.rooms || patch.adults !== undefined)) {
    return { error: 'Комерційні поля недоступні для цього статусу.' }
  }
  return patch
}

export function parseCalendarPrefill(params: URLSearchParams) {
  const roomId = params.get('roomId')?.trim() || undefined
  const checkIn = params.get('checkIn')?.trim() || undefined
  const checkOutRaw = params.get('checkOut')?.trim() || undefined
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return {
    roomId: roomId && uuid.test(roomId) ? roomId : undefined,
    checkIn: checkIn && isValidStayDate(checkIn) ? checkIn : undefined,
    checkOut: checkOutRaw && isValidStayDate(checkOutRaw) ? checkOutRaw : undefined,
  }
}

/** Strip unsupported client fields before POST create. */
export function sanitizeAdminBookingCreateBody(input: AdminBookingCreateInput): AdminBookingCreateInput {
  const body: AdminBookingCreateInput = {
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    guestCount: input.guestCount,
    source: input.source ?? 'ADMIN',
    status: input.status ?? 'CONFIRMED',
    rooms: input.rooms.map((room) => ({ roomId: room.roomId, ratePlanId: room.ratePlanId })),
  }
  if (input.adults !== undefined) body.adults = input.adults
  if (input.children !== undefined) body.children = input.children
  if (input.notes?.trim()) body.notes = input.notes.trim()
  if (input.promoCodeId) body.promoCodeId = input.promoCodeId
  if (input.guestId) {
    body.guestId = input.guestId
  } else if (input.guest) {
    body.guest = {
      firstName: input.guest.firstName.trim(),
      lastName: input.guest.lastName.trim(),
      ...(input.guest.phone?.trim() ? { phone: input.guest.phone.trim() } : {}),
      ...(input.guest.email?.trim() ? { email: input.guest.email.trim() } : {}),
      ...(input.guest.country?.trim() ? { country: input.guest.country.trim() } : {}),
      ...(input.guest.city?.trim() ? { city: input.guest.city.trim() } : {}),
    }
  }
  return body
}

/** Quote request body — matches QuoteBookingDto (no guest/status/prices). */
export function sanitizeAdminBookingQuoteBody(input: {
  checkIn: string
  checkOut: string
  guestCount: number
  rooms: { roomId: string; ratePlanId: string }[]
  excludeBookingId?: string
  promoCode?: string
}) {
  return {
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    guestCount: input.guestCount,
    rooms: input.rooms.map((room) => ({ roomId: room.roomId, ratePlanId: room.ratePlanId })),
    ...(input.excludeBookingId ? { excludeBookingId: input.excludeBookingId } : {}),
    ...(input.promoCode !== undefined ? { promoCode: input.promoCode } : {}),
  }
}

export function createBodyHasForbiddenFields(body: Record<string, unknown>) {
  const forbidden = [
    'totalAmount',
    'price',
    'accommodationAmount',
    'servicesAmount',
    'discountAmount',
    'paymentStatus',
    'paymentMethod',
    'services',
    'promoCode',
  ]
  return forbidden.filter((key) => key in body)
}
