/**
 * Accommodation labels and the simplified rooms/cottages screen.
 * Run: npx --yes tsx src/lib/accommodation-labels.verify.ts
 */
import { readFileSync } from 'node:fs'
import {
  bookingRoomFilterLabel,
  chessboardRoomLabel,
  isTechnicalUnitCode,
  referencedRoomOption,
  roomTypeColumnLabel,
  sharedRoomTypeNotice,
  unitDisplayCode,
  unitDisplayLabel,
  unitDisplayTitle,
  withReferencedRoom,
} from './accommodation-labels'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

assert(
  unitDisplayTitle({ name: 'Кімната Буковина', number: 'dakh-room-14-3' }, 'Номер 14/3') === 'Кімната Буковина',
  'meaningful unit name wins',
)
assert(
  unitDisplayTitle({ name: null, number: '14-3' }, 'Будинок 7') === 'Будинок 7',
  'room-type name is used when the unit has no name',
)
assert(unitDisplayTitle({ name: '  ', number: '14-3' }, '  ') === '14-3', 'physical number 14-3 is the next fallback')
assert(unitDisplayTitle({ name: null, number: '14/1' }) === '14/1', 'physical number 14/1 is a title when nothing else exists')
assert(
  unitDisplayTitle({ name: null, number: 'DAKH-7' }) === 'DAKH-7',
  'deliberate code DAKH-7 stays visible',
)
assert(
  unitDisplayTitle({ name: null, number: 'dakh-room-14-3' }, 'Номер 14/3') === 'Номер 14/3',
  'technical slug is not the title when a type name exists',
)
assert(
  unitDisplayTitle({ name: null, number: 'dakh-room-14-3' }) === 'Розміщення',
  'technical slug is not a title without a type',
)
assert(
  unitDisplayTitle({ name: 'dakh-room-14-3', number: '14-3' }, 'dakh-room-14-3') === '14-3',
  'a slug stored as the name or type is skipped',
)
assert(unitDisplayTitle({ name: null, number: '' }) === 'Розміщення', 'empty name and number use the neutral fallback')
assert(unitDisplayTitle({ name: '  ', number: '   ' }, null) === 'Розміщення', 'blank values use the neutral fallback')
assert(
  unitDisplayTitle({ name: null, number: '14-3' }, undefined) === '14-3',
  'missing room type falls through to the physical number',
)
assert(
  unitDisplayCode({ number: '14-3' }, 'Будинок 7') === '14-3',
  '14-3 stays as a secondary code',
)
assert(unitDisplayCode({ number: '14/1' }, 'Номер з терасою') === '14/1', '14/1 stays as a secondary code')
assert(unitDisplayCode({ number: 'DAKH-7' }, 'Будинок') === 'DAKH-7', 'DAKH-7 stays as a secondary code')
assert(unitDisplayCode({ number: 'dakh-room-14-3' }, 'Номер 14/3') === null, 'technical slug is not a secondary code')
assert(unitDisplayCode({ number: '14-3' }, '14-3') === null, 'duplicate title and code are suppressed')
assert(unitDisplayLabel({ name: null, number: '14-3' }, 'Будинок 7') === 'Будинок 7 · 14-3', 'label keeps a useful code')
assert(unitDisplayLabel({ name: 'Кімната Буковина', number: 'Кімната Буковина' }) === 'Кімната Буковина', 'label hides a repeated code')
assert(isTechnicalUnitCode('dakh-room-14-3'), 'dakh-room-14-3 is technical')
assert(!isTechnicalUnitCode('14-3'), '14-3 is not technical')
assert(!isTechnicalUnitCode('14/1'), '14/1 is not technical')
assert(!isTechnicalUnitCode('DAKH-7'), 'DAKH-7 is not technical')
assert(!isTechnicalUnitCode('14-3-1'), 'a numeric hyphenated code is not technical')
assert(roomTypeColumnLabel('Номер з терасою', 'ROOM') === 'Номер з терасою', 'type column uses the room-type name')
assert(roomTypeColumnLabel('dakh-room-14-3', 'COTTAGE') === 'Будиночок', 'type column does not show a slug')
assert(roomTypeColumnLabel(null, 'ROOM') === 'Номер', 'missing type uses Номер')
assert(roomTypeColumnLabel(undefined, 'COTTAGE') === 'Будиночок', 'missing type uses Будиночок')

const row = chessboardRoomLabel({
  roomId: 'room-1',
  number: 'dakh-room-14-3',
  name: null,
  typeName: 'Номер 14/3',
})
assert(row.roomId === 'room-1' && row.number === 'dakh-room-14-3', 'calendar label keeps roomId and raw number')
assert(row.title === 'Номер 14/3' && row.code === null, 'calendar label does not use the slug')
const namedRow = chessboardRoomLabel({
  roomId: 'room-2',
  number: '14/1',
  name: 'Кімната Буковина',
  typeName: 'Номер з терасою',
})
assert(namedRow.roomId === 'room-2' && namedRow.number === '14/1', 'named calendar row keeps its identifiers')
assert(namedRow.title === 'Кімната Буковина' && namedRow.code === '14/1', 'named calendar row shows the physical number once')

const withoutCount = sharedRoomTypeNotice(null)
const withCount = sharedRoomTypeNotice(3)
assert(withoutCount.includes('всіх розміщень цього типу'), 'shared edit explains the room type')
assert(!withoutCount.includes('Кількість'), 'shared edit omits a count that was not provided')
assert(withCount.includes('Кількість розміщень цього типу: 3.'), 'shared edit shows a known count')
assert(!withCount.includes('Sunny') && !withoutCount.includes('sunny'), 'shared copy has no legacy business name')
const archived = bookingRoomFilterLabel(
  { name: null, number: 'dakh-room-14-3', active: false },
  'Будинок 7',
)
assert(archived === 'Будинок 7 · вимкнений', 'archived room uses the type name')
assert(!archived.includes('dakh-room'), 'archived room label hides the slug')
assert(
  bookingRoomFilterLabel({ name: 'Кімната Буковина', number: '14/1', active: true }, 'Номер') === 'Кімната Буковина · 14/1',
  'booking filter keeps the physical number',
)
const missing = referencedRoomOption({
  rooms: [],
  roomId: 'room-archived',
  number: 'dakh-room-14-3',
  roomTypeId: 'type-1',
  typeName: 'Будинок 7',
})
assert(missing.roomId === 'room-archived', 'missing room keeps its roomId')
assert(missing.label === 'Будинок 7 · вимкнений', 'missing room gets a safe label')
const kept = withReferencedRoom([{ id: 'room-1' }, { id: 'room-2' }], { id: 'room-2' })
assert(kept.map((room) => room.id).join(',') === 'room-1,room-2', 'an already listed room is not duplicated')
const added = withReferencedRoom([{ id: 'room-1' }], { id: 'room-archived' })
assert(added.map((room) => room.id).join(',') === 'room-1,room-archived', 'a referenced room is appended by id')
console.log('PASS: human-readable accommodation labels')

const page = readFileSync(new URL('../pages/accommodations/AccommodationsPage.tsx', import.meta.url), 'utf8')
assert(page.includes('>Номери<'), 'rooms tab remains')
assert(page.includes('>Тип<'), 'type column is visible')
assert(page.includes('roomTypeColumnLabel'), 'type column uses the room-type name')
assert(!page.includes('<TableHead>Категорія</TableHead>'), 'category column is gone')
assert(page.includes('>Будиночки<'), 'cottages tab remains')
assert(!page.includes('>Будинок<'), 'cottage wording is Будиночок, not Будинок')
assert(!page.includes('>Категорії<'), 'categories tab is not in the navigation')
assert(!page.includes('value="categories"'), 'no categories tab value')
assert(!page.includes('Додати категорію'), 'cannot create categories from this screen')
assert(page.includes('Заблокувати дати'), 'date blocking stays on the unit')
assert(page.includes('Зняти блокування'), 'unblocking stays on the unit')
assert(page.includes('sharedRoomTypeNotice'), 'shared room-type editing is explicit')
assert(page.includes('maxGuests: guests'), 'shared capacity still uses the room-type payload')
assert(page.includes('Назва для гостей'), 'guest-facing name stays editable on the unit')
assert(page.includes('Опис'), 'description stays editable on the unit')
assert(page.includes('Місткість'), 'capacity stays editable on the unit')
assert(!page.includes('label="Slug"'), 'slug is not a primary field')
console.log('PASS: rooms and cottages navigation without a categories tab')

const calendar = readFileSync(new URL('../pages/calendar/CalendarPage.tsx', import.meta.url), 'utf8')
const chessboard = readFileSync(new URL('../components/calendar/Chessboard.tsx', import.meta.url), 'utf8')
assert(calendar.includes('/admin/bookings/new'), 'chessboard can still create a booking')
assert(calendar.includes('roomId: query.roomId'), 'booking navigation keeps roomId')
assert(calendar.includes('Заблокувати дати'), 'chessboard can still open date blocking')
assert(calendar.includes('listAllRooms'), 'calendar loads every room page for labels')
assert(calendar.includes('chessboardRoomLabel'), 'calendar uses the shared row label')
assert(!calendar.includes('number: roomDisplayName'), 'calendar does not overwrite room.number')
assert(chessboard.includes('room.displayTitle'), 'chessboard shows the display title')
assert(chessboard.includes('onEmpty(room.roomId'), 'chessboard selection keeps roomId')
assert(chessboard.includes('onBooking(bar.bookingId)'), 'chessboard booking click keeps bookingId')
const bookingForm = readFileSync(new URL('../components/bookings/AdminBookingForm.tsx', import.meta.url), 'utf8')
assert(bookingForm.includes('bookingRoomFilterLabel'), 'booking room picker uses the shared label')
assert(bookingForm.includes('roomId'), 'booking form still submits roomId')
const router = readFileSync(new URL('../router/index.tsx', import.meta.url), 'utf8')
assert(router.includes("path: 'accommodations'"), 'accommodations route remains')
assert(router.includes("path: 'bookings/new'"), 'booking creation route remains')
assert(!router.includes('categories'), 'router has no categories path')
console.log('PASS: booking creation and blocking links remain')

const rates = readFileSync(new URL('../pages/rates/StayPricingSections.tsx', import.meta.url), 'utf8')
assert(rates.includes("from '@/lib/accommodation-labels'"), 'rates use the shared label helper')
assert(!rates.includes('function unitDisplayTitle'), 'rates no longer keep a second title function')
assert(rates.includes('ScrollableFormDialog'), 'pinned pricing footer stays in place')
assert(rates.includes('lengthStayRoomTypeIdsForSave'), 'length-stay save waits for a complete room list')
assert(rates.includes('roomTypeIds,'), 'length-stay payload still sends roomTypeIds')
const bookingsPage = readFileSync(new URL('../pages/bookings/BookingsPage.tsx', import.meta.url), 'utf8')
assert(bookingsPage.includes('bookingRoomFilterLabel'), 'booking filter uses the shared label')
assert(bookingsPage.includes('useAllAdminRooms'), 'booking filter loads every room page')
assert(!bookingsPage.includes('roomDisplayName'), 'booking filter does not use the raw number helper')

const visible = [page, calendar, chessboard, rates, bookingForm, readFileSync(new URL('./accommodation-labels.ts', import.meta.url), 'utf8')]
const legacy = ['Sunny Park', 'sunny-park', 'Сонячний парк', 'BookMeNow']
for (const source of visible) {
  for (const name of legacy) assert(!source.includes(name), `legacy name ${name} is not user-facing`)
}
console.log('PASS: no legacy business name in the accommodation UI')

console.log('All accommodation label checks passed.')
