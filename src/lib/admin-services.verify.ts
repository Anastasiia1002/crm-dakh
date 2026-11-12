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
  SERVICE_ACTIVATE_NEEDS_PRICE,
  SERVICE_CHARGE_BASIS_LABEL,
  SERVICE_DEACTIVATE_CONFIRMATION,
  SERVICE_PRICE_CHANGE_NOTICE,
  SERVICE_PRICE_UNSET_LABEL,
  SERVICE_PUBLIC_STAY_ONLY_HINT,
  SUGGESTED_SERVICE_DEFAULTS,
  SUGGESTED_SERVICES_BUTTON,
  SUGGESTED_SERVICES_HINT,
  buildAdminServiceCreateBody,
  buildAdminServicePatchBody,
  canActivateManagedService,
  filterManagedServices,
  formatManagedServicePrice,
  normalizeServiceSelections,
  parseAdminServiceCatalog,
  parseEnsureSuggestedServicesResult,
  parseManagedAdminService,
  parseManagedAdminServiceCatalog,
  parseOptionalServiceQuantity,
  serviceDisplayName,
  serviceWriteBodyHasForbiddenFields,
  setServiceQuantity,
  snapshotCatalogSelection,
  toggleServiceSelection,
  validateOptionalServicePrice,
  validateServicePrice,
  validateServiceQuantity,
  validateServiceQuantityBounds,
  isPubliclyBookableService,
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
  assert(loaded.bookable === false && loaded.chargeBasis === 'PER_STAY', 'a response without bookable stays private')
  assert(loaded.minQuantity === null && loaded.maxQuantity === null, 'missing quantity limits use the public defaults')

  const published = parseManagedAdminService({
    id: BREAKFAST,
    name: 'Сніданок',
    description: null,
    price: '10.10',
    currency: 'UAH',
    active: true,
    bookable: true,
    chargeBasis: 'PER_STAY',
    minQuantity: 2,
    maxQuantity: 4,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-02T00:00:00.000Z',
  })
  assert(published.bookable === true && published.minQuantity === 2 && published.maxQuantity === 4, 'public limits load from the admin service')
  assert(isPubliclyBookableService(published), 'an active bookable service is offered online')
  assert(!isPubliclyBookableService({ active: false, bookable: true, price: '10.10' }), 'an inactive service stays off the public catalog')
  assert(!isPubliclyBookableService({ active: true, bookable: false, price: '10.10' }), 'a private service stays off the public catalog')
  const perNight = parseManagedAdminService({
    id: BREAKFAST,
    name: 'Сніданок',
    description: null,
    price: '10.10',
    currency: 'UAH',
    active: true,
    bookable: true,
    chargeBasis: 'PER_NIGHT',
    minQuantity: null,
    maxQuantity: null,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-02T00:00:00.000Z',
  })
  assert(perNight.chargeBasis === 'PER_NIGHT', 'PER_NIGHT is a catalog charge basis')
  assert(!isPubliclyBookableService(perNight), 'non-stay charge stays off the public catalog')
  let rejectedBasis = false
  try {
    parseManagedAdminService({
      id: BREAKFAST,
      name: 'Сніданок',
      description: null,
      price: '10.10',
      currency: 'UAH',
      active: true,
      bookable: true,
      chargeBasis: 'PER_HOUR',
      minQuantity: null,
      maxQuantity: null,
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-02T00:00:00.000Z',
    })
  } catch {
    rejectedBasis = true
  }
  assert(rejectedBasis, 'unknown charge bases are rejected')

  const privateCreate = buildAdminServiceCreateBody({
    name: 'Трансфер',
    description: '',
    price: '100',
    active: true,
  })
  assert(
    privateCreate.ok && privateCreate.body.bookable === false && privateCreate.body.chargeBasis === 'PER_STAY',
    'a new service stays private and is charged once per stay',
  )
  assert(privateCreate.ok && !('minQuantity' in privateCreate.body) && !('maxQuantity' in privateCreate.body), 'blank quantities keep the 1 and 99 defaults')
  const publicCreate = buildAdminServiceCreateBody({
    name: 'Сніданок',
    description: '',
    price: '150.00',
    active: true,
    bookable: true,
    minQuantity: '2',
    maxQuantity: '4',
  })
  assert(
    publicCreate.ok &&
      publicCreate.body.bookable === true &&
      publicCreate.body.minQuantity === 2 &&
      publicCreate.body.maxQuantity === 4,
    'enabling online booking sends bookable and the quantity limits',
  )
  assert(!buildAdminServiceCreateBody({ name: 'Сніданок', description: '', price: '10', active: true, minQuantity: '0' }).ok, 'quantity below 1 is rejected')
  assert(!buildAdminServiceCreateBody({ name: 'Сніданок', description: '', price: '10', active: true, maxQuantity: '100' }).ok, 'quantity above 99 is rejected')
  assert(!buildAdminServiceCreateBody({ name: 'Сніданок', description: '', price: '10', active: true, minQuantity: '1.5' }).ok, 'fractional quantity is rejected')
  const crossed = buildAdminServiceCreateBody({
    name: 'Сніданок',
    description: '',
    price: '10',
    active: true,
    minQuantity: '5',
    maxQuantity: '2',
  })
  assert(!crossed.ok && crossed.field === 'maxQuantity', 'minimum cannot exceed maximum')
  assert(parseOptionalServiceQuantity('').ok && parseOptionalServiceQuantity('').quantity === null, 'an empty quantity is optional')
  assert(validateServiceQuantityBounds(1, 99) === null && validateServiceQuantityBounds(2, 2) === null, 'equal bounds are allowed')

  const enabled = buildAdminServicePatchBody(loaded, {
    name: loaded.name,
    description: '',
    price: loaded.price ?? '',
    active: true,
    bookable: true,
  })
  assert(enabled.ok && enabled.body.bookable === true && Object.keys(enabled.body).join() === 'bookable', 'enabling public availability sends only bookable')
  const disabled = buildAdminServicePatchBody(published, {
    name: published.name,
    description: '',
    price: published.price ?? '',
    active: true,
    bookable: false,
    minQuantity: '2',
    maxQuantity: '4',
  })
  assert(disabled.ok && disabled.body.bookable === false && Object.keys(disabled.body).join() === 'bookable', 'disabling public availability sends only bookable')
  const clearedLimit = buildAdminServicePatchBody(published, {
    name: published.name,
    description: '',
    price: published.price ?? '',
    active: true,
    bookable: true,
    minQuantity: '',
    maxQuantity: '4',
  })
  assert(clearedLimit.ok && clearedLimit.body.minQuantity === null && !('bookable' in clearedLimit.body), 'clearing a limit sends null and keeps bookable')
  assert(
    parseAdminServiceCatalog({
      items: [
        { id: BREAKFAST, name: 'Сніданок', description: null, price: '10.10', currency: 'UAH', active: true, bookable: false },
      ],
    })[0]?.id === BREAKFAST,
    'the staff booking picker still lists an active private service',
  )

  assert(page.includes('Доступна для онлайн-бронювання'), 'the form names the public switch')
  assert(page.includes('За бронювання') || page.includes('SERVICE_PUBLIC_STAY_ONLY_HINT'), 'the form still names the per-stay unit')
  assert(page.includes('role="switch"'), 'public availability is a switch')
  assert(page.includes('ADMIN_SERVICE_CHARGE_BASES') && page.includes('SERVICE_CHARGE_BASIS_LABEL'), 'the form offers staff charge bases')
  assert(page.includes('SERVICE_PUBLIC_STAY_ONLY_HINT'), 'public booking stays PER_STAY in the copy')
  assert(page.includes('На сайті') && page.includes('Лише в CRM'), 'the catalog shows whether a service is public')
  assert(page.includes('SUGGESTED_SERVICES_BUTTON') && page.includes('SUGGESTED_SERVICES_HINT'), 'suggested services stay off until priced')
  assert(page.includes('SERVICE_PRICE_UNSET_LABEL'), 'unset price is labeled as not set')
  assert(page.includes('ensure-suggested') === false, 'the page uses the hook, not a raw path')
  assert(page.includes('useEnsureSuggestedAdminServices'), 'write roles can insert suggested defaults')
  assert(SERVICE_CHARGE_BASIS_LABEL.PER_NIGHT === 'За ніч' && SERVICE_CHARGE_BASIS_LABEL.PER_PERSON_DAY === 'За людину на добу', 'charge bases have Ukrainian unit labels')
  assert(SUGGESTED_SERVICES_BUTTON === 'Додати шаблонні послуги', 'suggested-services button copy')

  const picker = readFileSync(new URL('../components/bookings/AdminServicePicker.tsx', import.meta.url), 'utf8')
  assert(picker.includes('savedLine.unitPrice'), 'picker shows saved historical unitPrice')
  assert(picker.includes('Немає в активному каталозі'), 'inactive saved lines stay on the booking form')
  assert(picker.includes('SERVICE_CHARGE_BASIS_LABEL'), 'picker shows the unit hint')
  assert(picker.includes('Активних послуг із ціною немає'), 'picker requires a catalog price')

  const unset = parseManagedAdminService({
    id: BREAKFAST,
    name: 'Трансфер',
    description: null,
    price: null,
    currency: 'UAH',
    active: false,
    bookable: false,
    chargeBasis: 'PER_TRIP',
    sortOrder: 3,
    category: 'логістика',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-02T00:00:00.000Z',
  })
  assert(unset.price === null && unset.chargeBasis === 'PER_TRIP' && unset.sortOrder === 3 && unset.category === 'логістика', 'managed catalog keeps an unset price')
  assert(formatManagedServicePrice(null) === SERVICE_PRICE_UNSET_LABEL, 'unset price is not shown as free')
  assert(!canActivateManagedService(unset), 'a service without a price cannot be activated')
  assert(
    !buildAdminServiceCreateBody({ name: 'Трансфер', description: '', price: '', active: true }).ok,
    'create cannot activate without a price',
  )
  const draft = buildAdminServiceCreateBody({
    name: 'Трансфер',
    description: '',
    price: '',
    active: false,
    chargeBasis: 'PER_TRIP',
  })
  assert(draft.ok && draft.body.price === null && draft.body.chargeBasis === 'PER_TRIP' && draft.body.active === false, 'unset price is sent as null')
  assert(validateOptionalServicePrice('').ok && validateOptionalServicePrice('').price === null, 'blank price is unset')
  assert(
    parseAdminServiceCatalog({
      items: [
        { id: BREAKFAST, name: 'Сніданок', description: null, price: '10.10', currency: 'UAH', active: true },
        { id: DINNER, name: 'Вечеря', description: null, price: null, currency: 'UAH', active: true },
      ],
    }).map((item) => item.id).join() === BREAKFAST,
    'booking picker hides active services without a price',
  )
  const snapshot = snapshotCatalogSelection({ id: BREAKFAST, price: '10.10' }, 2)
  assert(snapshot.ok && snapshot.quantity === 2 && snapshot.unitPrice === '10.10', 'quantity snapshots the catalog unit price')
  assert(!snapshotCatalogSelection({ id: BREAKFAST, price: '10.10' }, 0).ok, 'snapshot still validates quantity')
  assert(SUGGESTED_SERVICE_DEFAULTS.every((item) => item.name.length > 0 && !('active' in item && item.active)), 'suggested defaults are named and not pre-activated')
  assert(SUGGESTED_SERVICE_DEFAULTS.some((item) => item.name === 'Сніданок' && item.chargeBasis === 'PER_PERSON_DAY'), 'breakfast is per person-day')
  const ensured = parseEnsureSuggestedServicesResult({ insertedCount: 7, skippedCount: 0 })
  assert(ensured.insertedCount === 7 && ensured.skippedCount === 0, 'ensure-suggested reports insert counts')
  assert(api.includes('/api/admin/services/ensure-suggested'), 'API client can insert suggested services')
  assert(SERVICE_ACTIVATE_NEEDS_PRICE.includes('ціни'), 'activation copy requires a price')

  console.log('PASS: admin extra-service catalog uses GET /api/admin/services')
}

main()
