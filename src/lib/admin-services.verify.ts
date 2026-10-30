/**
 * Admin extra-service catalog from GET /api/admin/services.
 * Run: npx --yes tsx src/lib/admin-services.verify.ts
 */
import { readFileSync } from 'node:fs'
import { ApiError } from './api-error'
import { errorMessage } from './errors'
import {
  buildAdminBookingCreateInput,
  buildAdminBookingUpdateInput,
  createBodyHasForbiddenFields,
  sanitizeAdminBookingCreateBody,
  sanitizeAdminBookingQuoteBody,
} from './admin-booking-view'
import {
  ADMIN_SERVICE_CATALOG_AVAILABLE,
  normalizeServiceSelections,
  parseAdminServiceCatalog,
  serviceDisplayName,
  setServiceQuantity,
  toggleServiceSelection,
  validateServiceQuantity,
} from './admin-services'
import type { AdminBookingDetail } from '@/types'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

const BREAKFAST = '88888888-8888-4888-8888-888888888881'
const DINNER = '88888888-8888-4888-8888-888888888884'

function main() {
  assert(ADMIN_SERVICE_CATALOG_AVAILABLE === true, 'catalog is available after GET /api/admin/services')

  assert(parseAdminServiceCatalog({ items: [] }).length === 0, 'empty catalog')
  const populated = parseAdminServiceCatalog({
    items: [
      {
        id: BREAKFAST,
        name: 'Сніданок',
        description: 'Сніданок у ресторані',
        price: '10.10',
        currency: 'UAH',
        active: true,
      },
      {
        id: DINNER,
        name: 'Вечеря',
        description: null,
        price: '20.00',
        currency: 'UAH',
        active: true,
      },
    ],
  })
  assert(populated.length === 2 && populated[0]?.price === '10.10' && populated[1]?.description === null, 'parses UAH catalog')

  let threw = false
  try {
    parseAdminServiceCatalog({ items: [{ id: BREAKFAST, name: 'X', description: null, price: 100, currency: 'UAH', active: true }] })
  } catch (error) {
    threw = error instanceof ApiError
  }
  assert(threw, 'rejects numeric mock prices')
  threw = false
  try {
    parseAdminServiceCatalog({
      items: [{ id: BREAKFAST, name: 'X', description: null, price: '10.10', currency: 'USD', active: true }],
    })
  } catch (error) {
    threw = error instanceof ApiError
  }
  assert(threw, 'rejects non-UAH catalog rows')

  assert(validateServiceQuantity(0) !== null && validateServiceQuantity(1.5) !== null, 'invalid quantity')
  assert(validateServiceQuantity(1) === null && validateServiceQuantity(99) === null, 'valid quantity')
  assert(validateServiceQuantity(100) !== null, 'quantity max')
  assert(!normalizeServiceSelections([{ serviceId: BREAKFAST, quantity: 1 }, { serviceId: BREAKFAST, quantity: 2 }]).ok, 'duplicate selection')
  const toggled = toggleServiceSelection([], BREAKFAST, true)
  assert(toggled.length === 1 && setServiceQuantity(toggled, BREAKFAST, 3)[0]?.quantity === 3, 'toggle and quantity')
  assert(toggleServiceSelection(toggled, BREAKFAST, true).length === 1, 'selecting twice does not duplicate')

  const created = buildAdminBookingCreateInput({
    guestMode: 'new',
    guestId: '',
    guest: { firstName: 'Іван', lastName: 'Коваль', phone: '+380501112233', email: 'a@b.c' },
    checkIn: '2026-10-20',
    checkOut: '2026-10-22',
    adults: 2,
    children: 0,
    roomId: 'r1',
    ratePlanId: 'p1',
    services: [{ serviceId: BREAKFAST, quantity: 2 }],
  })
  assert(!('error' in created), 'create body builds with services')
  if (!('error' in created)) {
    assert(created.services?.[0]?.serviceId === BREAKFAST && created.services[0]?.quantity === 2, 'create sends serviceId and quantity')
    assert(!('unitPrice' in (created.services?.[0] ?? {})), 'create does not send client unit prices')
    const sanitized = sanitizeAdminBookingCreateBody(created)
    assert(sanitized.services?.[0]?.quantity === 2, 'sanitized create keeps services')
    assert(createBodyHasForbiddenFields(sanitized as unknown as Record<string, unknown>).length === 0, 'valid services are allowed')
    assert(
      createBodyHasForbiddenFields({ ...sanitized, services: [{ serviceId: BREAKFAST, quantity: 1, unitPrice: '1.00' }] }).includes(
        'services',
      ),
      'priced service rows stay forbidden',
    )
  }

  const without = buildAdminBookingCreateInput({
    guestMode: 'new',
    guestId: '',
    guest: { firstName: 'Іван', lastName: 'Коваль', phone: '+380501112233', email: 'a@b.c' },
    checkIn: '2026-10-20',
    checkOut: '2026-10-22',
    adults: 2,
    children: 0,
    roomId: 'r1',
    ratePlanId: 'p1',
  })
  assert(!('error' in without) && !('services' in without), 'create omits services when none selected')

  const quote = sanitizeAdminBookingQuoteBody({
    checkIn: '2026-10-20',
    checkOut: '2026-10-22',
    guestCount: 2,
    rooms: [{ roomId: 'r1', ratePlanId: 'p1' }],
    services: [{ serviceId: BREAKFAST, quantity: 2 }],
  })
  assert(quote.services?.[0]?.serviceId === BREAKFAST && quote.services[0]?.quantity === 2, 'quote sends selected services')
  const cleared = sanitizeAdminBookingQuoteBody({
    checkIn: '2026-10-20',
    checkOut: '2026-10-22',
    guestCount: 2,
    rooms: [{ roomId: 'r1', ratePlanId: 'p1' }],
    services: [],
  })
  assert(Array.isArray(cleared.services) && cleared.services.length === 0, 'edit quote can send empty services')

  const savedLine = {
    id: 'line-1',
    serviceId: BREAKFAST,
    quantity: 2,
    unitPrice: '10.10',
    totalPrice: '20.20',
  }
  const bookingWithServices: AdminBookingDetail = {
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
    notes: 'note',
    cancellationReason: null,
    cancelledAt: null,
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
    nights: [],
    services: [savedLine],
    price: {
      roomSubtotal: '2400.00',
      servicesTotal: '20.20',
      discountAmount: '0.00',
      taxAmount: '0.00',
      totalAmount: '2420.20',
      currency: 'UAH',
    },
    totalAmount: '2420.20',
    currency: 'UAH',
  }
  const notesOnly = buildAdminBookingUpdateInput({
    booking: bookingWithServices,
    role: 'admin',
    guestMode: 'keep',
    guestId: 'g1',
    guest: { firstName: 'Іван', lastName: 'Коваль', phone: '+380501112233', email: 'a@b.c' },
    checkIn: '2026-10-10',
    checkOut: '2026-10-12',
    adults: 2,
    children: 0,
    roomId: 'r1',
    ratePlanId: 'p1',
    notes: 'оновлена примітка',
    services: [{ serviceId: BREAKFAST, quantity: 2 }],
    servicesChanged: false,
  })
  assert(!('error' in notesOnly) && !('services' in notesOnly), 'unrelated patch omits services and keeps saved lines')
  const quantityChange = buildAdminBookingUpdateInput({
    booking: bookingWithServices,
    role: 'admin',
    guestMode: 'keep',
    guestId: 'g1',
    guest: { firstName: 'Іван', lastName: 'Коваль', phone: '+380501112233', email: 'a@b.c' },
    checkIn: '2026-10-10',
    checkOut: '2026-10-12',
    adults: 2,
    children: 0,
    roomId: 'r1',
    ratePlanId: 'p1',
    notes: 'note',
    services: [{ serviceId: BREAKFAST, quantity: 3 }],
    servicesChanged: true,
  })
  assert(!('error' in quantityChange) && quantityChange.services?.[0]?.quantity === 3, 'patch sends quantity for a saved inactive-or-active line')
  assert(
    !('error' in quantityChange) &&
      quantityChange.services?.[0] &&
      !('unitPrice' in quantityChange.services[0]) &&
      !('totalPrice' in quantityChange.services[0]),
    'patch never sends catalog or client prices for historical lines',
  )
  const clearedPatch = buildAdminBookingUpdateInput({
    booking: bookingWithServices,
    role: 'admin',
    guestMode: 'keep',
    guestId: 'g1',
    guest: { firstName: 'Іван', lastName: 'Коваль', phone: '+380501112233', email: 'a@b.c' },
    checkIn: '2026-10-10',
    checkOut: '2026-10-12',
    adults: 2,
    children: 0,
    roomId: 'r1',
    ratePlanId: 'p1',
    notes: 'note',
    services: [],
    servicesChanged: true,
  })
  assert(!('error' in clearedPatch) && Array.isArray(clearedPatch.services) && clearedPatch.services.length === 0, 'explicit empty patch clears services')
  assert(
    serviceDisplayName(BREAKFAST, []) === `Збережена послуга ${BREAKFAST.slice(0, 8)}`,
    'missing catalog name uses a saved-service fallback',
  )
  assert(serviceDisplayName(BREAKFAST, populated) === 'Сніданок', 'active catalog name is used when present')

  assert(errorMessage(new ApiError('x', 401, 'UNAUTHORIZED')).includes('Сесія недійсна'), '401')
  assert(errorMessage(new ApiError('Недостатньо прав', 403, 'FORBIDDEN')).includes('Недостатньо прав'), '403')
  assert(errorMessage(new ApiError('x', 404, 'SERVICE_NOT_FOUND')).includes('не знайдено'), '404 service')
  assert(errorMessage(new ApiError('x', 500, 'INTERNAL')).includes('недоступний'), '500')
  assert(errorMessage(new ApiError('x', 409, 'SERVICE_INACTIVE')).includes('неактивна'), 'inactive service')
  assert(errorMessage(new ApiError('x', 409, 'DUPLICATE_SERVICE')).includes('повторено'), 'duplicate service')

  const form = readFileSync(new URL('../components/bookings/AdminBookingForm.tsx', import.meta.url), 'utf8')
  assert(form.includes('useAdminServices'), 'booking form loads the admin catalog')
  assert(form.includes('AdminServicePicker'), 'booking form has a service picker')
  assert(!form.includes("from '@/api/services'"), 'booking form does not use the mock services API')
  assert(!form.includes('getServices') && !form.includes('useSaveService'), 'booking form does not mutate a local catalog')
  assert(!form.includes('mocks/db'), 'booking form does not read mock rows')

  const page = readFileSync(new URL('../pages/services/ServicesPage.tsx', import.meta.url), 'utf8')
  assert(page.includes('useAdminServices'), 'services page loads the live catalog')
  assert(!page.includes('Додати послугу') && !page.includes('useSaveService'), 'services page has no catalog mutations')
  assert(!page.includes('mocks/db') && !page.includes("from '@/api/services'"), 'services page does not load mock rows')
  assert(!page.includes('ADMIN_SERVICE_CATALOG_BLOCKED_LABEL'), 'services page is no longer blocked')

  const api = readFileSync(new URL('../api/admin-services.ts', import.meta.url), 'utf8')
  assert(api.includes("'/api/admin/services'"), 'API client calls the deployed catalog')
  assert(!api.includes('mocks/db'), 'API client is not the mock module')
  console.log('PASS: admin extra-service catalog uses GET /api/admin/services')
}

main()
