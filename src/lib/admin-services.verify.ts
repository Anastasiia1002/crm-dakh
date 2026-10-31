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
  SERVICE_DEACTIVATE_CONFIRMATION,
  SERVICE_PRICE_CHANGE_NOTICE,
  buildAdminServiceCreateBody,
  buildAdminServicePatchBody,
  filterManagedServices,
  normalizeServiceSelections,
  parseAdminServiceCatalog,
  parseManagedAdminService,
  parseManagedAdminServiceCatalog,
  serviceDisplayName,
  serviceWriteBodyHasForbiddenFields,
  setServiceQuantity,
  toggleServiceSelection,
  validateServicePrice,
  validateServiceQuantity,
} from './admin-services'
import { canManageAdminServices } from './roles'
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
  assert(
    errorMessage(new ApiError('x', 409, 'SERVICE_NAME_CONFLICT')).includes('такою назвою'),
    'duplicate service name',
  )

  const form = readFileSync(new URL('../components/bookings/AdminBookingForm.tsx', import.meta.url), 'utf8')
  assert(form.includes('useAdminServices'), 'booking form loads the admin catalog')
  assert(form.includes('AdminServicePicker'), 'booking form has a service picker')
  assert(!form.includes("from '@/api/services'"), 'booking form does not use the mock services API')
  assert(!form.includes('getServices') && !form.includes('useSaveService'), 'booking form does not mutate a local catalog')
  assert(!form.includes('mocks/db'), 'booking form does not read mock rows')

  const page = readFileSync(new URL('../pages/services/ServicesPage.tsx', import.meta.url), 'utf8')
  assert(page.includes('useManagedAdminServices'), 'services page loads the management catalog')
  assert(page.includes('Додати послугу'), 'admins can open create')
  assert(page.includes('Редагувати послугу'), 'edit modal title')
  assert(page.includes('canManageAdminServices'), 'write actions use the service-catalog role helper')
  assert(page.includes('Недостатньо прав для цієї дії'), 'mutations still check role in the UI')
  assert(page.includes(SERVICE_DEACTIVATE_CONFIRMATION), 'deactivation asks for confirmation')
  assert(page.includes(SERVICE_PRICE_CHANGE_NOTICE), 'price edits warn that saved booking lines stay')
  assert(!page.includes('useSaveService') && !page.includes('DELETE'), 'services page does not delete or use the mock save')
  assert(!page.includes('mocks/db') && !page.includes("from '@/api/services'"), 'services page does not load mock rows')
  assert(!page.includes('ADMIN_SERVICE_CATALOG_BLOCKED_LABEL'), 'services page is no longer blocked')

  const api = readFileSync(new URL('../api/admin-services.ts', import.meta.url), 'utf8')
  assert(api.includes("'/api/admin/services'"), 'picker client calls the deployed catalog')
  assert(api.includes('/api/admin/services?active=all'), 'management list asks for inactive rows')
  assert(api.includes("method: 'POST'"), 'create uses POST')
  assert(api.includes("method: 'PATCH'"), 'update uses PATCH')
  assert(!api.includes('DELETE'), 'API client has no DELETE')
  assert(!api.includes('mocks/db'), 'API client is not the mock module')
  assert(!api.includes('hotelId') && !api.includes('currency'), 'write client does not send hotelId or currency')

  const hooks = readFileSync(new URL('../hooks/useAdminServices.ts', import.meta.url), 'utf8')
  assert(hooks.includes('listAdminServices(signal)'), 'booking picker still loads GET /api/admin/services')
  assert(!hooks.includes("listAdminServices") || hooks.includes("listManagedAdminServices"), 'management has a separate query')
  assert(hooks.includes('adminServicesQueryKey') && hooks.includes('adminManagedServicesQueryKey'), 'picker and management caches are distinct')
  assert(hooks.includes('adminServiceMutationInvalidateKeys'), 'mutations refresh both catalogs')
  assert(!hooks.includes('retry: true'), 'mutations do not silently retry POST or PATCH')

  assert(canManageAdminServices('owner') && canManageAdminServices('admin'), 'owner and admin can mutate')
  assert(!canManageAdminServices('manager') && !canManageAdminServices('receptionist'), 'desk roles are read-only')

  assert(parseManagedAdminServiceCatalog({ items: [] }).length === 0, 'empty management catalog')
  const managed = parseManagedAdminServiceCatalog({
    items: [
      {
        id: BREAKFAST,
        name: 'Сніданок',
        description: 'Сніданок у ресторані',
        price: '10.10',
        currency: 'UAH',
        active: true,
        createdAt: '2026-10-01T00:00:00.000Z',
        updatedAt: '2026-10-02T00:00:00.000Z',
      },
      {
        id: DINNER,
        name: 'Вечеря',
        description: null,
        price: '20.00',
        currency: 'UAH',
        active: false,
        createdAt: '2026-10-01T00:00:00.000Z',
        updatedAt: '2026-10-03T00:00:00.000Z',
      },
    ],
  })
  assert(managed.length === 2 && managed[1]?.active === false, 'management catalog keeps inactive rows')
  assert(
    parseAdminServiceCatalog({
      items: [
        { id: BREAKFAST, name: 'Сніданок', description: null, price: '10.10', currency: 'UAH', active: true },
        { id: DINNER, name: 'Вечеря', description: null, price: '20.00', currency: 'UAH', active: false },
      ],
    }).map((item) => item.id).join() === BREAKFAST,
    'booking picker stays active-only',
  )
  const createdBody = buildAdminServiceCreateBody({
    name: '  Сніданок  ',
    description: '  ',
    price: '10.1',
    active: true,
  })
  assert(createdBody.ok && createdBody.body.name === 'Сніданок' && createdBody.body.description === null, 'create trims name and empty description')
  assert(createdBody.ok && createdBody.body.price === '10.10' && createdBody.body.active === true, 'create sends a decimal price string')
  assert(createdBody.ok && serviceWriteBodyHasForbiddenFields(createdBody.body as unknown as Record<string, unknown>).length === 0, 'create omits hotelId and currency')
  assert(!buildAdminServiceCreateBody({ name: '', description: '', price: '10.00', active: true }).ok, 'empty name')
  assert(!buildAdminServiceCreateBody({ name: 'X'.repeat(101), description: '', price: '10.00', active: true }).ok, 'oversized name')
  assert(!validateServicePrice(10.1).ok, 'numeric JSON price is rejected')
  assert(!validateServicePrice('0.00').ok && !validateServicePrice('-1.00').ok, 'zero and negative prices are rejected')
  const patched = buildAdminServicePatchBody(managed[0]!, {
    name: 'Сніданок',
    description: 'Сніданок у ресторані',
    price: '10.10',
    active: true,
  })
  assert(!patched.ok && 'empty' in patched, 'unchanged edit does not send an empty PATCH')
  const pricePatch = buildAdminServicePatchBody(managed[0]!, {
    name: 'Сніданок',
    description: 'Сніданок у ресторані',
    price: '99.99',
    active: true,
  })
  assert(pricePatch.ok && pricePatch.body.price === '99.99' && Object.keys(pricePatch.body).join() === 'price', 'patch sends only changed fields')
  assert(pricePatch.ok && !('unitPrice' in pricePatch.body) && !('totalPrice' in pricePatch.body), 'catalog patch never rewrites booking prices')
  const duplicateName = { error: 'SERVICE_NAME_CONFLICT' }
  assert(duplicateName.error === 'SERVICE_NAME_CONFLICT', 'duplicate names surface SERVICE_NAME_CONFLICT')
  const filtered = filterManagedServices(managed, { query: 'веч', status: 'all' })
  assert(filtered.map((item) => item.id).join() === DINNER, 'name search')
  assert(filterManagedServices(managed, { query: '', status: 'inactive' }).every((item) => !item.active), 'inactive filter keeps deactivated rows')

  const loaded = parseManagedAdminService({
    id: BREAKFAST,
    name: 'Сніданок',
    description: null,
    price: '10.10',
    currency: 'UAH',
    active: true,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-02T00:00:00.000Z',
    hotelId: 'should-be-ignored-if-present',
  })
  assert(loaded.currency === 'UAH' && !('hotelId' in loaded), 'GET :id view does not expose hotelId')

  const picker = readFileSync(new URL('../components/bookings/AdminServicePicker.tsx', import.meta.url), 'utf8')
  assert(picker.includes('savedLine.unitPrice'), 'picker shows saved historical unitPrice')
  assert(picker.includes('Немає в активному каталозі'), 'inactive saved lines stay on the booking form')

  console.log('PASS: admin extra-service catalog uses GET /api/admin/services')
}

main()
