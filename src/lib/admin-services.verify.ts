/**
 * Extra-service catalog is blocked until GET /api/admin/services exists.
 * Run: npx --yes tsx src/lib/admin-services.verify.ts
 */
import { readFileSync } from 'node:fs'
import { buildAdminBookingCreateInput, createBodyHasForbiddenFields, sanitizeAdminBookingCreateBody } from './admin-booking-view'
import {
  ADMIN_SERVICE_CATALOG_AVAILABLE,
  ADMIN_SERVICE_CATALOG_BLOCKED_LABEL,
  adminBookingServicesBlockedMessage,
  adminServiceCatalogMessage,
} from './admin-services'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

function main() {
  assert(ADMIN_SERVICE_CATALOG_AVAILABLE === false, 'catalog stays closed without a verified endpoint')
  assert(ADMIN_SERVICE_CATALOG_BLOCKED_LABEL === 'BLOCKED BY BACKEND', 'blocked label is explicit')
  assert(adminServiceCatalogMessage().includes('GET /api/admin/services'), 'catalog copy names the missing endpoint')
  assert(!adminServiceCatalogMessage().toLowerCase().includes('mock'), 'catalog copy does not mention mock data')
  assert(adminBookingServicesBlockedMessage().includes('не надсилаються'), 'booking form does not post guessed services')

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
  })
  assert(!('error' in created), 'create body still builds without a service picker')
  if (!('error' in created)) {
    assert(!('services' in created), 'create payload omits services')
    const sanitized = sanitizeAdminBookingCreateBody(created)
    assert(!('services' in sanitized), 'sanitized create payload omits services')
    assert(createBodyHasForbiddenFields({ ...sanitized, services: [] }).includes('services'), 'services stay forbidden on create')
  }

  const form = readFileSync(new URL('../components/bookings/AdminBookingForm.tsx', import.meta.url), 'utf8')
  assert(form.includes('adminBookingServicesBlockedMessage'), 'booking form shows the blocked catalog')
  assert(!form.includes('getServices') && !form.includes('useServices') && !form.includes('mocks/db'), 'booking form does not read the local catalog')
  assert(!form.includes('serviceIds') && !form.includes('quantity'), 'booking form has no service quantity picker')

  const page = readFileSync(new URL('../pages/services/ServicesPage.tsx', import.meta.url), 'utf8')
  assert(page.includes('ADMIN_SERVICE_CATALOG_BLOCKED_LABEL'), 'services page is marked blocked')
  assert(!page.includes('useServices') && !page.includes('useSaveService') && !page.includes('Додати послугу'), 'services page does not edit local rows')
  assert(!page.includes('mocks/db'), 'services page does not load mock rows')

  const quote = readFileSync(new URL('./admin-booking-view.ts', import.meta.url), 'utf8')
  assert(quote.includes('sanitizeAdminBookingQuoteBody') && !quote.includes('services: input.services'), 'quote body does not attach guessed services')
  console.log('PASS: admin extra-service catalog remains blocked')
}

main()
