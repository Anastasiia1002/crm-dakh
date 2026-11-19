/**
 * Accommodation labels and the simplified rooms/cottages screen.
 * Run: npx --yes tsx src/lib/accommodation-labels.verify.ts
 */
import { readFileSync } from 'node:fs'
import {
  bookingRoomFilterLabel,
  COTTAGE_KIND_GROUP_LABEL,
  ROOM_KIND_GROUP_LABEL,
  roomsGroupedByKind,
  chessboardRoomLabel,
  chessboardStickyLabel,
  isTechnicalUnitCode,
  referencedRoomOption,
  roomTypeColumnLabel,
  unitContentNotice,
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
assert(
  chessboardStickyLabel({
    groupTitle: '4-кімнатний будиночок до 7 гостей №11',
    displayTitle: '4-кімнатний будиночок до 7 гостей №11',
    displayCode: '№11',
  }).title === '№11',
  'chessboard row drops a duplicate type title',
)
assert(
  chessboardStickyLabel({
    groupTitle: 'Номер з терасою',
    displayTitle: 'Кімната Буковина',
    displayCode: '14/1',
  }).title === 'Кімната Буковина',
  'a unique unit name stays on the row',
)

const unitNotice = unitContentNotice()
assert(unitNotice.includes('цьому розміщенню'), 'guest content belongs to the physical unit')
assert(!unitNotice.includes('типу розміщення'), 'staff copy does not say content belongs to a shared type')
assert(!unitNotice.includes('Sunny'), 'unit copy has no legacy business name')
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
const groupedUnits = roomsGroupedByKind(
  [
    { id: 'c1', roomTypeId: 'cottage' },
    { id: 'r1', roomTypeId: 'room' },
  ],
  [
    { id: 'room', kind: 'ROOM' },
    { id: 'cottage', kind: 'COTTAGE' },
  ],
)
assert(groupedUnits[0]?.label === ROOM_KIND_GROUP_LABEL && groupedUnits[0]?.items[0]?.id === 'r1', 'rooms list first')
assert(groupedUnits[1]?.label === COTTAGE_KIND_GROUP_LABEL && groupedUnits[1]?.items[0]?.id === 'c1', 'cottages list second')
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
assert(page.includes('/admin/accommodations/new?kind='), 'create opens a full page')
assert(page.includes('/admin/accommodations/${item.id}/edit'), 'edit opens a full page')
assert(!page.includes('function UnitDialog'), 'unit editing is no longer a modal')
const editor = readFileSync(new URL('../pages/accommodations/AccommodationEditorPage.tsx', import.meta.url), 'utf8')
assert(!editor.includes('sharedRoomTypeNotice'), 'shared room-type editing is not shown')
assert(editor.includes('unitContentNotice'), 'unit-owned content is explained')
assert(editor.includes('maxGuests: guests'), 'capacity is saved on the unit')
assert(editor.includes('Назва для гостей'), 'guest-facing name stays editable on the unit')
assert(editor.includes('Опис'), 'description stays editable on the unit')
assert(editor.includes('Місткість'), 'capacity stays editable on the unit')
assert(!editor.includes('label="Slug"'), 'slug is not a primary field')
assert(editor.includes('useBlocker'), 'leaving the editor warns about unsaved changes')
assert(editor.includes('UnitHistory'), 'accommodation editor shows unit history')
console.log('PASS: rooms and cottages navigation without a categories tab')

const calendar = readFileSync(new URL('../pages/calendar/CalendarPage.tsx', import.meta.url), 'utf8')
const chessboard = readFileSync(new URL('../components/calendar/Chessboard.tsx', import.meta.url), 'utf8')
assert(calendar.includes('/admin/bookings/new'), 'chessboard can still create a booking')
assert(calendar.includes('roomId: query.roomId'), 'booking navigation keeps roomId')
assert(calendar.includes('Заблокувати дати'), 'chessboard can still open date blocking')
assert(calendar.includes('listAllRooms'), 'calendar loads every room page for labels')
assert(calendar.includes('chessboardRoomLabel'), 'calendar uses the shared row label')
assert(calendar.includes('ROOM_KIND_GROUP_LABEL') && calendar.includes('COTTAGE_KIND_GROUP_LABEL'), 'calendar kind filter uses Номери and Будиночки')
assert(!calendar.includes('number: roomDisplayName'), 'calendar does not overwrite room.number')
assert(chessboard.includes('chessboardStickyLabel'), 'chessboard avoids repeating the type heading')
assert(chessboard.includes('ROOM_KIND_GROUP_LABEL') && chessboard.includes('COTTAGE_KIND_GROUP_LABEL'), 'chessboard has room and cottage sections')
assert(page.includes('Закрито на дати'), 'date blocks are not occupancy')
assert(page.includes('У роботі'), 'catalog status is not free tonight')
assert(chessboard.includes('onEmpty(room.roomId'), 'chessboard selection keeps roomId')
assert(chessboard.includes('onBooking(bar.bookingId)'), 'chessboard booking click keeps bookingId')
const bookingForm = readFileSync(new URL('../components/bookings/AdminBookingForm.tsx', import.meta.url), 'utf8')
assert(bookingForm.includes('bookingRoomFilterLabel'), 'booking room picker uses the shared label')
assert(bookingForm.includes('AccommodationSelectGroups'), 'booking form groups rooms and cottages')
assert(bookingForm.includes('roomId'), 'booking form still submits roomId')
const router = readFileSync(new URL('../router/index.tsx', import.meta.url), 'utf8')
assert(router.includes("path: 'accommodations'"), 'accommodations route remains')
assert(router.includes("path: 'bookings/new'"), 'booking creation route remains')
assert(!router.includes('categories'), 'router has no categories path')
console.log('PASS: booking creation and blocking links remain')

const rates = readFileSync(new URL('../pages/rates/StayPricingSections.tsx', import.meta.url), 'utf8')
const workspace = readFileSync(new URL('../pages/rates/PriceWorkspace.tsx', import.meta.url), 'utf8')
assert(workspace.includes('DateRangePicker'), 'daily workspace uses the shared night range picker')
assert(workspace.includes('allowPast={false}'), 'price edits cannot select past nights')
assert(workspace.includes('UnitMultiSelect'), 'workspace picker is grouped by physical unit')
assert(workspace.includes('Номери та будиночки'), 'workspace selects rooms and cottages')
assert(workspace.includes('replaceOverlaps'), 'overlap replace is an explicit confirm')
assert(workspace.includes('Понеділок'), 'seven weekday prices are labeled in Ukrainian')
assert(rates.includes("from '@/lib/accommodation-labels'"), 'rates use the shared label helper')
assert(!rates.includes('function unitDisplayTitle'), 'rates no longer keep a second title function')
assert(rates.includes('ScrollableFormDialog'), 'pinned pricing footer stays in place')
assert(rates.includes('lengthStayRoomTypeIdsForSave'), 'length-stay save waits for a complete room list')
assert(rates.includes('Приклад суми проживання'), 'length-stay preview is not a stored subtotal')
assert(rates.includes('roomTypeIds,'), 'length-stay payload still sends roomTypeIds')
const bookingsPage = readFileSync(new URL('../pages/bookings/BookingsPage.tsx', import.meta.url), 'utf8')
assert(bookingsPage.includes('AccommodationSelectGroups'), 'booking filter groups rooms and cottages')
assert(bookingsPage.includes('downloadBookingsCsv'), 'bookings page can export the current list')
assert(bookingsPage.includes('Експортувати за фільтрами'), 'full filtered booking export is available')
assert(bookingsPage.includes('exportAdminBookingsCsv'), 'filtered export stays on the server')
assert(bookingsPage.includes('useAllAdminRooms'), 'booking filter loads every room page')
assert(!bookingsPage.includes('roomDisplayName'), 'booking filter does not use the raw number helper')

const gallery = readFileSync(
  new URL('../components/accommodations/AccommodationPhotoGallery.tsx', import.meta.url),
  'utf8',
)
const visible = [
  page,
  editor,
  gallery,
  calendar,
  chessboard,
  rates,
  bookingForm,
  readFileSync(new URL('./accommodation-labels.ts', import.meta.url), 'utf8'),
]
const legacy = ['Sunny Park', 'sunny-park', 'Сонячний парк', 'BookMeNow']
for (const source of visible) {
  for (const name of legacy) assert(!source.includes(name), `legacy name ${name} is not user-facing`)
}
console.log('PASS: no legacy business name in the accommodation UI')

console.log('All accommodation label checks passed.')
