/**
 * Admin guest directory mapping. Run: npx --yes tsx src/lib/admin-guests.verify.ts
 */
import { readFileSync } from 'node:fs'
import { ApiError } from './api-error.js'
import {
  guestDirectoryPath,
  guestFailure,
  guestFailureMessage,
  guestHistoryPath,
  guestPlaceLabel,
  guestProfilePath,
  guestStayRoomLabel,
  parseGuestDirectoryPage,
  parseGuestHistoryPage,
  parseGuestProfile,
} from './admin-guests.js'
import { formatMoneyAmount } from './format.js'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

const guestId = '11111111-1111-4111-8111-111111111111'
const bookingId = '22222222-2222-4222-8222-222222222222'
const roomA = '33333333-3333-4333-8333-333333333333'
const roomB = '44444444-4444-4444-8444-444444444444'

const listBody = {
  items: [
    {
      id: guestId,
      firstName: 'Іван',
      lastName: 'Коваль',
      email: 'ivan@example.com',
      phone: '+380671112233',
      country: 'Україна',
      city: 'Чернівці',
      bookingsCount: 3,
      lastCheckIn: '2026-12-10',
    },
    {
      id: '55555555-5555-4555-8555-555555555555',
      firstName: 'Олена',
      lastName: 'Без контактів',
      email: null,
      phone: null,
      country: null,
      city: null,
      bookingsCount: 0,
      lastCheckIn: null,
    },
  ],
  pagination: { page: 2, limit: 20, total: 21, totalPages: 2 },
}

const stay = {
  id: bookingId,
  checkIn: '2026-12-10',
  checkOut: '2026-12-11',
  status: 'CONFIRMED',
  source: 'WEBSITE',
  adults: 2,
  children: 0,
  rooms: [
    {
      roomId: roomA,
      roomTypeId: roomA,
      ratePlanId: roomA,
      number: '101',
      roomTypeName: 'Deluxe',
      displayLabel: 'Deluxe · 101',
    },
    {
      roomId: roomB,
      roomTypeId: roomB,
      ratePlanId: roomB,
      number: '7',
      roomTypeName: 'Будиночок',
      displayLabel: 'Будиночок · 7',
    },
  ],
  totalAmount: '180.00',
  currency: 'UAH',
}

const profileBody = {
  guest: {
    id: guestId,
    firstName: 'Іван',
    lastName: 'Коваль',
    email: 'ivan@example.com',
    phone: '+380671112233',
    country: 'Україна',
    city: 'Чернівці',
    notes: 'Постійний гість',
    createdAt: '2026-01-15T12:00:00Z',
  },
  stats: {
    bookingsCount: 3,
    lastCheckIn: '2026-12-10',
    completedStays: 1,
    totalNights: 3,
    totalSpent: '430.00',
    currency: 'UAH',
  },
  history: [],
}

const historyBody = {
  items: [stay],
  pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
}

const listed = parseGuestDirectoryPage(listBody)
assert(listed.items.length === 2, 'guest list maps both rows')
assert(listed.items[0]?.bookingsCount === 3, 'booking count stays a number')
assert(listed.items[0]?.lastCheckIn === '2026-12-10', 'last check-in is the API date')
assert(listed.items[1]?.email === null && listed.items[1]?.lastCheckIn === null, 'optional contact and date stay null')
assert(listed.page === 2 && listed.limit === 20 && listed.total === 21 && listed.totalPages === 2, 'pagination is server metadata')
assert(guestPlaceLabel(listed.items[0]!.country, listed.items[0]!.city) === 'Україна, Чернівці', 'country and city stay together')
assert(guestPlaceLabel(null, null) === '—', 'missing place is blank')

assert(
  guestDirectoryPath({ page: 1, limit: 20, search: '  Коваль ' }) === '/api/admin/guests?page=1&limit=20&search=%D0%9A%D0%BE%D0%B2%D0%B0%D0%BB%D1%8C',
  'search is trimmed and sent to the server',
)
assert(guestDirectoryPath({ page: 3, limit: 20, search: '   ' }) === '/api/admin/guests?page=3&limit=20', 'blank search is omitted')
assert(guestProfilePath(guestId) === `/api/admin/guests/${guestId}`, 'profile path uses the guest id')
assert(
  guestHistoryPath(guestId, { page: 2, limit: 20 }) === `/api/admin/guests/${guestId}/bookings?page=2&limit=20`,
  'history path is paginated',
)

const profile = parseGuestProfile(profileBody)
assert(profile.guest.notes === 'Постійний гість', 'notes stay on the profile')
assert(profile.guest.createdAt === '2026-01-15T12:00:00Z', 'created time stays a string')
assert(profile.stats.totalSpent === '430.00', 'spent amount stays a decimal string')
assert(profile.stats.currency === 'UAH', 'stats currency is kept')
assert(profile.history.length === 0, 'empty profile history is an empty list')
assert(formatMoneyAmount(profile.stats.totalSpent) === '430,00\u00a0₴', 'string money formats without number conversion')

const history = parseGuestHistoryPage(historyBody)
assert(history.items[0]?.id === bookingId, 'history uses the booking id')
assert(history.items[0]?.source === 'WEBSITE', 'website source is preserved')
assert(history.items[0]?.totalAmount === '180.00', 'stored total stays a string')
assert(guestStayRoomLabel(history.items[0]!.rooms) === 'Deluxe · 101, Будиночок · 7', 'multiple room labels are joined')
assert(history.total === 1 && history.page === 1, 'history pagination is mapped')

const emptyHistory = parseGuestHistoryPage({ items: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } })
assert(emptyHistory.items.length === 0 && emptyHistory.total === 0, 'empty history page is valid')
assert(guestStayRoomLabel([]) === '—', 'a stay without rooms has no invented label')

let rejected = false
try {
  parseGuestDirectoryPage({ items: [{ ...listBody.items[0], bookingsCount: '3' }] })
} catch {
  rejected = true
}
assert(rejected, 'a malformed list is rejected')

assert(guestFailure(new ApiError('no', 401, 'UNAUTHORIZED')) === 'unauthorized', '401 is unauthorized')
assert(guestFailure(new ApiError('no', 403, 'FORBIDDEN')) === 'forbidden', '403 is forbidden')
assert(guestFailure(new ApiError('no', 404, 'GUEST_NOT_FOUND')) === 'missing', '404 is missing')
assert(guestFailure(new ApiError('no', 500, 'INTERNAL')) === 'unavailable', 'server failure is not a guest')
assert(guestFailure(new Error('network')) === 'unavailable', 'network failure is not a guest')
assert(!guestFailureMessage('unavailable').toLowerCase().includes('mock'), 'failure copy does not mention a mock')

const api = readFileSync(new URL('../api/guests.ts', import.meta.url), 'utf8')
const directory = readFileSync(new URL('../pages/guests/GuestsPage.tsx', import.meta.url), 'utf8')
const profilePage = readFileSync(new URL('../pages/guests/GuestPage.tsx', import.meta.url), 'utf8')
const hooks = readFileSync(new URL('../hooks/useGuestDirectory.ts', import.meta.url), 'utf8')
assert(api.includes('/api/admin/guests') === false, 'paths live in the mapper')
assert(api.includes('listAdminGuests') && api.includes('getAdminGuest') && api.includes('listAdminGuestBookings'), 'three guest reads')
assert(!api.includes('mocks/db') && !api.includes('saveGuest') && !api.includes('importGuest'), 'guest API has no mock writes')
assert(!hooks.includes('mocks/db') && !hooks.includes('useSaveGuest') && !hooks.includes('useImportGuests'), 'hooks do not write guests')
assert(directory.includes('Додавання, редагування, імпорт і експорт тут недоступні'), 'directory explains unsupported actions')
assert(!directory.includes('Імпортувати') && !directory.includes('Експортувати') && !directory.includes('Додати гостя'), 'write buttons are gone')
assert(directory.includes('guests.data.total'), 'total comes from the page payload')
assert(!directory.includes('newGuests') && !directory.includes('Постійний'), 'no invented guest categories')
assert(profilePage.includes('Редагування картки гостя недоступне'), 'profile edit is unavailable')
assert(profilePage.includes('useGuestHistory'), 'history uses its own request')
assert(!profilePage.includes('profile.data.history'), 'profile history slice is not the table')
assert(!profilePage.includes('Країна і місто') && !profilePage.includes('guestPlaceLabel'), 'guest details do not show city and country')
assert(profilePage.includes('Email') && profilePage.includes('Телефон'), 'guest contact stays on the details page')
assert(profilePage.includes('useGuestHistory') && profilePage.includes('GuestBookingHistory'), 'booking history still loads on guest details')

const guestStats = readFileSync(new URL('../components/guests/GuestStats.tsx', import.meta.url), 'utf8')
const settingsPage = readFileSync(new URL('../pages/settings/SettingsPage.tsx', import.meta.url), 'utf8')
assert(guestStats.includes('Сума бронювань'), 'guest total is labeled as booking value')
assert(!guestStats.includes('Витрачено'), 'guest total is not labeled as money already spent')
assert(guestStats.includes('не отримані оплати'), 'guest total says it is not received payments')
assert(!settingsPage.includes('patch.currency'), 'hotel settings form does not change currency')
assert(settingsPage.includes('дозволена лише гривня'), 'currency field explains UAH only')

console.log('PASS: admin guest directory uses the hotel API')
