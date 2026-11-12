/**
 * Admin guest directory mapping. Run: npx --yes tsx src/lib/admin-guests.verify.ts
 */
import { readFileSync } from 'node:fs'
import { ApiError } from './api-error.js'
import {
  guestDirectoryPath,
  guestExportPath,
  guestFailure,
  guestFailureMessage,
  guestHistoryPath,
  guestImportCommitPath,
  guestImportPreviewPath,
  guestPlaceLabel,
  guestProfilePath,
  guestSaveHint,
  guestStayRoomLabel,
  parseGuestDirectoryPage,
  parseGuestHistoryPage,
  parseGuestProfile,
} from './admin-guests.js'
import { formatMoneyAmount } from './format.js'
import { GUEST_IMPORT_HISTORY_TITLE } from './guest-import.js'
import { canExportGuests, canImportGuests, canWriteGuests } from './roles.js'

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
      notes: 'VIP',
      createdAt: '2026-01-15',
      visitCount: 1,
      lastVisit: '2026-10-03',
    },
    {
      id: '55555555-5555-4555-8555-555555555555',
      firstName: 'Олена',
      lastName: 'Без контактів',
      email: null,
      phone: null,
      notes: null,
      createdAt: '2026-03-01',
      visitCount: 0,
      lastVisit: null,
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
    contactShared: false,
  },
  stats: {
    bookingsCount: 3,
    lastCheckIn: '2026-12-10',
    completedStays: 1,
    visitCount: 1,
    lastVisit: '2026-10-03',
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
assert(listed.items[0]?.visitCount === 1, 'visit count stays a number')
assert(listed.items[0]?.lastVisit === '2026-10-03', 'last visit is the API date')
assert(listed.items[1]?.email === null && listed.items[1]?.lastVisit === null, 'optional contact and date stay null')
assert(listed.page === 2 && listed.limit === 20 && listed.total === 21 && listed.totalPages === 2, 'pagination is server metadata')
assert(guestPlaceLabel('Україна', 'Чернівці') === 'Україна, Чернівці', 'country and city stay together')
assert(guestPlaceLabel(null, null) === '—', 'missing place is blank')
assert(listed.items[0]?.notes === 'VIP', 'hotel notes stay on the list')

assert(
  guestExportPath({ page: 1, limit: 20, lastVisit: 'never' }, 'csv') ===
    '/api/admin/guests/export?page=1&limit=20&lastVisit=never&format=csv',
  'export uses the same hotel filters',
)
assert(
  guestDirectoryPath({ page: 1, limit: 20, search: '  Коваль ', sort: 'visitCount', order: 'desc' }) ===
    '/api/admin/guests?page=1&limit=20&search=%D0%9A%D0%BE%D0%B2%D0%B0%D0%BB%D1%8C&sort=visitCount&order=desc',
  'search is trimmed and sort is sent to the server',
)
assert(guestDirectoryPath({ page: 3, limit: 20, search: '   ' }) === '/api/admin/guests?page=3&limit=20', 'blank search is omitted')
assert(guestProfilePath(guestId) === `/api/admin/guests/${guestId}`, 'profile path uses the guest id')
assert(
  guestHistoryPath(guestId, { page: 2, limit: 20 }) === `/api/admin/guests/${guestId}/bookings?page=2&limit=20`,
  'history path is paginated',
)

const profile = parseGuestProfile(profileBody)
assert(profile.guest.notes === 'Постійний гість', 'notes stay on the profile')
assert(profile.guest.contactShared === false, 'exclusive contacts are not locked')
assert(profile.guest.createdAt === '2026-01-15T12:00:00Z', 'created time stays a string')
assert(profile.stats.totalSpent === '430.00', 'spent amount stays a decimal string')
assert(profile.stats.currency === 'UAH', 'stats currency is kept')
assert(profile.importedStats === null, 'missing imported stats stay null')
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
  parseGuestDirectoryPage({ items: [{ ...listBody.items[0], visitCount: '3' }] })
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
assert(
  guestSaveHint(new ApiError('x', 409, 'GUEST_EMAIL_EXISTS')) === 'Клієнт з таким email уже є в цьому готелі.',
  'same-hotel email conflict copy',
)
assert(
  guestSaveHint(new ApiError('Підтвердіть приєднання', 409, 'GUEST_EMAIL_IN_USE')) === 'Підтвердіть приєднання',
  'foreign email reuse copy',
)
assert(
  guestSaveHint(new ApiError('Можливий дублікат', 409, 'GUEST_POSSIBLE_DUPLICATE')) === 'Можливий дублікат',
  'phone duplicate copy',
)
assert(
  guestSaveHint(new ApiError('Лише коментар', 409, 'GUEST_CONTACT_SHARED')) === 'Лише коментар',
  'shared contact copy',
)
assert(guestSaveHint(new ApiError('no', 403, 'FORBIDDEN')) === 'Недостатньо прав для цієї дії.', 'save 403')

const api = readFileSync(new URL('../api/guests.ts', import.meta.url), 'utf8')
const directory = readFileSync(new URL('../pages/guests/GuestsPage.tsx', import.meta.url), 'utf8')
const profilePage = readFileSync(new URL('../pages/guests/GuestPage.tsx', import.meta.url), 'utf8')
const hooks = readFileSync(new URL('../hooks/useGuestDirectory.ts', import.meta.url), 'utf8')
assert(api.includes('/api/admin/guests') === false, 'paths live in the mapper')
assert(api.includes('listAdminGuests') && api.includes('createAdminGuest') && api.includes('downloadAdminGuests'), 'guest reads and writes')
assert(!api.includes('mocks/db') && !api.includes('importGuest'), 'guest API has no mock import')
assert(hooks.includes('useSaveGuest') && hooks.includes('useExportGuests'), 'hooks write and export guests')
assert(directory.includes('Ваша клієнтська база тут'), 'directory subtitle matches clients copy')
assert(directory.includes('canWrite') && directory.includes('canExport') && directory.includes('canImport'), 'create, export, and import follow staff roles')
assert(directory.includes('Імпорт') && directory.includes('GuestImportDialog'), 'import wizard is shown for allowed roles')
assert(directory.includes('sort') && directory.includes('order'), 'directory sends sort to the API')
assert(canWriteGuests('receptionist') && !canExportGuests('receptionist'), 'reception can write clients but not export')
assert(!canExportGuests('manager') && !canExportGuests('admin') && canExportGuests('owner'), 'only owner exports guests')
assert(canImportGuests('owner') && canImportGuests('admin'), 'owner and admin can import guests')
assert(!canImportGuests('manager') && !canImportGuests('receptionist'), 'desk roles cannot import guests')
assert(directory.includes('guests.data.total'), 'total comes from the page payload')
assert(!directory.includes('newGuests') && !directory.includes('Постійний'), 'no invented guest categories')
assert(profilePage.includes('Редагувати') && profilePage.includes('Створити бронювання'), 'profile can edit and prefill a booking')
assert(profilePage.includes('useGuestHistory'), 'history uses its own request')
assert(!profilePage.includes('profile.data.history'), 'profile history slice is not the table')
assert(profilePage.includes('Країна і місто') && profilePage.includes('guestPlaceLabel'), 'guest details show stored place')
assert(profilePage.includes('contactShared') && profilePage.includes('canWrite'), 'shared contacts lock and roles hide edit')
assert(profilePage.includes('guestSaveHint'), 'profile edit uses shared save-error copy')
const createDialog = readFileSync(new URL('../components/guests/GuestFormDialog.tsx', import.meta.url), 'utf8')
assert(createDialog.includes('guestSaveHint'), 'create dialog uses shared save-error copy')
assert(profilePage.includes('Email') && profilePage.includes('Телефон'), 'guest contact stays on the details page')
assert(profilePage.includes('useGuestHistory') && profilePage.includes('GuestBookingHistory'), 'booking history still loads on guest details')

const guestStats = readFileSync(new URL('../components/guests/GuestStats.tsx', import.meta.url), 'utf8')
const settingsPage = readFileSync(new URL('../pages/settings/SettingsPage.tsx', import.meta.url), 'utf8')
assert(guestStats.includes('Сума бронювань'), 'guest total is labeled as booking value')
assert(!guestStats.includes('Витрачено'), 'guest total is not labeled as money already spent')
assert(guestStats.includes('не отримані оплати'), 'guest total says it is not received payments')
assert(guestStats.includes(GUEST_IMPORT_HISTORY_TITLE), 'imported history is labeled separately')
assert(!guestStats.includes('stats.visitCount +') && !guestStats.includes('importedStats.stayCount +'), 'imported stats are not added to CRM stats')
assert(guestImportPreviewPath() === '/api/admin/guests/import/preview', 'preview path')
assert(guestImportCommitPath() === '/api/admin/guests/import/commit', 'commit path')
assert(api.includes('previewAdminGuestImport') && api.includes('commitAdminGuestImport'), 'guest import uses preview and commit')
assert(api.includes('authorizedFormUpload'), 'import uploads multipart')

const importedProfile = parseGuestProfile({
  ...profileBody,
  importedStats: {
    stayCount: 10,
    lastStayOn: '2026-09-29',
    nightCount: 16,
    spendAmount: '77700.00',
    source: 'csv',
  },
})
assert(importedProfile.stats.visitCount === 1 && importedProfile.stats.totalNights === 3, 'CRM stats stay on directory bookings')
assert(
  importedProfile.importedStats?.stayCount === 10 &&
    importedProfile.importedStats.nightCount === 16 &&
    importedProfile.importedStats.spendAmount === '77700.00',
  'imported stats parse separately',
)
assert(importedProfile.stats.visitCount !== importedProfile.importedStats?.stayCount, 'imported stays are not merged into visitCount')
assert(importedProfile.stats.totalSpent !== importedProfile.importedStats?.spendAmount, 'imported spend is not merged into totalSpent')
assert(!settingsPage.includes('patch.currency'), 'hotel settings form does not change currency')
assert(settingsPage.includes('дозволена лише гривня'), 'currency field explains UAH only')

console.log('PASS: admin guest directory uses the hotel API')
