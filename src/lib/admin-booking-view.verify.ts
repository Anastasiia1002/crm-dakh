/**
 * Dependency-free checks for admin booking list/detail/lifecycle mapping.
 * Run: npx --yes tsx src/lib/admin-booking-view.verify.ts
 */
import {
  adminBookingDateFilterReady,
  adminBookingRef,
  adminBookingStatusActions,
  adminGuestName,
  adminRoomsLabel,
  assertAdminBookingDetail,
  assertAdminBookingListItem,
  buildAdminBookingCreateInput,
  buildAdminBookingUpdateInput,
  canEditAdminBookingCommercial,
  canEditAdminBookingProfile,
  canReassignAdminBookingRoom,
  createBodyHasForbiddenFields,
  formatAdminBookingMoney,
  guestCountFromOccupancy,
  parseCalendarPrefill,
  sanitizeAdminBookingCreateBody,
  sanitizeAdminBookingQuoteBody,
  toAdminBookingListQuery,
  validateStayDates,
} from './admin-booking-view'
import { ApiError } from './api-error'
import { errorMessage } from './errors'
import type { AdminBookingDetail, AdminBookingListItem } from '@/types'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

const baseListItem: AdminBookingListItem = {
  id: 'b1',
  status: 'CONFIRMED',
  source: 'ADMIN',
  checkIn: '2026-10-10',
  checkOut: '2026-10-12',
  adults: 2,
  children: 0,
  guestCount: 2,
  promoCodeId: null,
  createdAt: '2026-10-01T00:00:00.000Z',
  guest: {
    id: 'g1',
    firstName: 'Іван',
    lastName: 'Коваль',
    email: 'a@b.c',
    phone: '+380501112233',
    country: null,
    city: null,
  },
  rooms: [{ roomId: 'r1', number: '101', roomTypeId: 't1', roomTypeName: 'Standard', ratePlanId: 'p1' }],
  totalAmount: '2400.00',
  currency: 'UAH',
}

const baseDetail: AdminBookingDetail = {
  ...baseListItem,
  notes: 'note',
  cancellationReason: null,
  cancelledAt: null,
  nights: [{ id: 'n1', roomId: 'r1', date: '2026-10-10', price: '1200.00', currency: 'UAH' }],
  price: {
    roomSubtotal: '2400.00',
    servicesTotal: '0.00',
    discountAmount: '0.00',
    taxAmount: '0.00',
    totalAmount: '2400.00',
    currency: 'UAH',
  },
  services: [],
}

export function runAdminBookingViewChecks(): string[] {
  const results: string[] = []

  assert(adminBookingRef('abcdef12-3456-7890') === 'abcdef12', 'ref shortens uuid')
  assert(adminGuestName(baseListItem.guest) === 'Іван Коваль', 'guest name')
  assert(adminRoomsLabel(baseListItem.rooms) === 'Standard · 101', 'rooms label uses the type, then the physical number')
  assert(
    adminRoomsLabel([{ ...baseListItem.rooms[0], number: 'dakh-room-14-3', roomTypeName: 'Номер 14/3' }]) === 'Номер 14/3',
    'rooms label hides a technical slug',
  )
  assert(
    adminRoomsLabel([{ ...baseListItem.rooms[0], number: 'dakh-room-14-3', roomTypeName: 'dakh-room-14-3' }]) === 'Розміщення',
    'archived slug without a usable type uses the neutral fallback',
  )
  assert(adminRoomsLabel(baseListItem.rooms) !== baseListItem.rooms[0]?.roomId, 'rooms label is not the room id')
  assert(formatAdminBookingMoney('1200.50', 'UAH').includes('1'), 'uah money')
  results.push('Display helpers PASS')

  const query = toAdminBookingListQuery({
    page: 2,
    limit: 20,
    search: '  коваль  ',
    status: 'CONFIRMED',
    source: 'ADMIN',
    roomId: 'room-1',
    checkIn: '2026-10-10',
    checkOut: '2026-10-14',
  })
  assert(query.search === 'коваль' && query.checkIn === '2026-10-10', 'query mapping')
  assert(adminBookingDateFilterReady('2026-10-10', '').partial === true, 'partial date')
  results.push('Query mapping PASS')

  assert(validateStayDates('2026-10-10', '2026-10-09') !== null, 'date order')
  assert(validateStayDates('2026-10-10', '2026-10-12') === null, 'date ok')
  assert(guestCountFromOccupancy(2, 1) === 3, 'guestCount')
  assert(guestCountFromOccupancy(0, 0) === 1, 'guestCount min 1')
  results.push('Date validation PASS')

  const created = buildAdminBookingCreateInput({
    guestMode: 'new',
    guestId: '',
    guest: { firstName: 'Іван', lastName: 'Коваль', phone: '+380501112233', email: 'a@b.c' },
    checkIn: '2026-10-10',
    checkOut: '2026-10-12',
    adults: 2,
    children: 0,
    roomId: 'r1',
    ratePlanId: 'p1',
  })
  assert(!('error' in created), 'create ok')
  if (!('error' in created)) {
    assert(created.source === 'ADMIN' && created.status === 'CONFIRMED', 'create defaults')
    assert(created.guestId === undefined && created.guest?.firstName === 'Іван', 'guest xor')
    assert(!('totalAmount' in created) && created.rooms.length === 1, 'no client price')
    assert(!('services' in created), 'create omits services until the catalog exists')
  }

  const both = buildAdminBookingCreateInput({
    guestMode: 'existing',
    guestId: 'g1',
    guest: { firstName: 'X', lastName: 'Y', phone: '+380501112233' },
    checkIn: '2026-10-10',
    checkOut: '2026-10-12',
    adults: 1,
    children: 0,
    roomId: 'r1',
    ratePlanId: 'p1',
  })
  assert(!('error' in both) && both.guestId === 'g1' && both.guest === undefined, 'existing guestId only')
  results.push('Create payload PASS')

  assert(canEditAdminBookingCommercial('CONFIRMED') === true, 'commercial confirmed')
  assert(canEditAdminBookingCommercial('CHECKED_IN') === false, 'commercial checked-in')
  assert(canEditAdminBookingProfile('CHECKED_IN') === true, 'profile checked-in')
  assert(canReassignAdminBookingRoom('receptionist') === false, 'receptionist no reassign')
  assert(canReassignAdminBookingRoom('manager') === true, 'manager reassign')

  const reassignDenied = buildAdminBookingUpdateInput({
    booking: baseDetail,
    role: 'receptionist',
    guestMode: 'keep',
    guestId: 'g1',
    guest: { firstName: 'Іван', lastName: 'Коваль', phone: '+380501112233', email: 'a@b.c' },
    checkIn: '2026-10-10',
    checkOut: '2026-10-12',
    adults: 2,
    children: 0,
    roomId: 'r2',
    ratePlanId: 'p1',
    notes: 'note',
  })
  assert('error' in reassignDenied, 'receptionist room change blocked')

  const profileOnly = buildAdminBookingUpdateInput({
    booking: { ...baseDetail, status: 'CHECKED_IN' },
    role: 'receptionist',
    guestMode: 'keep',
    guestId: 'g1',
    guest: { firstName: 'Іван', lastName: 'Коваль', phone: '+380509999999', email: 'a@b.c' },
    checkIn: '2026-10-10',
    checkOut: '2026-10-12',
    adults: 2,
    children: 0,
    roomId: 'r1',
    ratePlanId: 'p1',
    notes: 'updated',
  })
  assert(!('error' in profileOnly) && profileOnly.guest?.phone === '+380509999999', 'checked-in profile')
  assert(!('error' in profileOnly) && profileOnly.checkIn === undefined, 'checked-in no dates')
  results.push('Role / edit restrictions PASS')

  assert(adminBookingStatusActions('PENDING').includes('confirm'), 'pending confirm')
  assert(adminBookingStatusActions('CONFIRMED').includes('check-in'), 'confirmed check-in')
  assert(adminBookingStatusActions('CHECKED_IN').includes('check-out'), 'checked-in checkout')
  assert(!adminBookingStatusActions('CANCELLED').includes('cancel'), 'cancelled no actions')
  results.push('Status actions PASS')

  const prefill = parseCalendarPrefill(
    new URLSearchParams('roomId=11111111-1111-4111-8111-111111111111&checkIn=2026-10-10&checkOut=2026-10-11'),
  )
  assert(Boolean(prefill.roomId?.startsWith('11111111')) && prefill.checkIn === '2026-10-10', 'calendar prefill')
  assert(parseCalendarPrefill(new URLSearchParams('roomId=not-a-uuid&checkIn=bad')).roomId === undefined, 'bad prefill ignored')
  results.push('Calendar navigation PASS')

  assert(assertAdminBookingListItem(baseListItem).length === 0, 'list shape')
  assert(assertAdminBookingDetail(baseDetail).length === 0, 'detail shape')
  results.push('DTO shape checks PASS')

  if (!('error' in created)) {
    const sanitized = sanitizeAdminBookingCreateBody(created)
    assert(createBodyHasForbiddenFields(sanitized as unknown as Record<string, unknown>).length === 0, 'no forbidden create fields')
    assert(sanitized.guestId === undefined || sanitized.guest === undefined, 'guest xor after sanitize')
  }
  const quoteBody = sanitizeAdminBookingQuoteBody({
    checkIn: '2026-10-10',
    checkOut: '2026-10-12',
    guestCount: 2,
    rooms: [{ roomId: 'r1', ratePlanId: 'p1' }],
  })
  assert(
    JSON.stringify(Object.keys(quoteBody).sort()) === JSON.stringify(['checkIn', 'checkOut', 'guestCount', 'rooms'].sort()),
    'quote keys',
  )
  const quotedWithPromo = sanitizeAdminBookingQuoteBody({
    checkIn: '2026-10-10',
    checkOut: '2026-10-12',
    guestCount: 2,
    rooms: [{ roomId: 'r1', ratePlanId: 'p1' }],
    promoCode: 'WINTER10',
  })
  assert(quotedWithPromo.promoCode === 'WINTER10', 'quote keeps a typed promo code')
  assert(!('totalAmount' in quotedWithPromo), 'quote does not carry a client total')
  assert(!('promoCode' in quoteBody), 'omitted promo stays off the quote body')
  assert(
    errorMessage(new ApiError('x', 409, 'INVALID_STATUS_TRANSITION')).includes('Неможлива зміна статусу'),
    '409 status transition',
  )
  assert(errorMessage(new ApiError('x', 409, 'ROOM_UNAVAILABLE')).includes('недоступний'), '409 room unavailable')
  results.push('Sanitize + 409 handling PASS')

  return results
}

export function printAdminBookingViewChecks() {
  for (const line of runAdminBookingViewChecks()) console.log(line)
  console.log('All admin booking view checks passed.')
}

const entryArg = (globalThis as { process?: { argv?: string[] } }).process?.argv?.[1]
if (entryArg?.includes('admin-booking-view.verify')) {
  printAdminBookingViewChecks()
}
