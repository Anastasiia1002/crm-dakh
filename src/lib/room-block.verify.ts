/**
 * Date-blocking copy, reason mapping, and conflict messages.
 * Run: npx --yes tsx src/lib/room-block.verify.ts
 */
import { readFileSync } from 'node:fs'
import { ApiError } from './api-error'
import { addCalendarDays } from './dates'
import {
  blockDialogPrefill,
  bookingQueryFromSelection,
  emptyNightIntent,
  nextNightSelection,
  repairBlockEndDate,
  showCalendarBlockButton,
} from './calendar-selection'
import {
  BLOCK_REASON_OPTIONS,
  blockConfirmMessage,
  blockConflictMessage,
  blockReasonLabel,
  blockWriteFromReason,
  blockedNights,
  formatExclusiveSpanUk,
  formatNightSpanUk,
  lastBlockedNight,
  unblockConfirmMessage,
} from './room-block'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

const cottage = { name: 'Будиночок 1', number: 'H1' }

assert(BLOCK_REASON_OPTIONS.map((option) => option.id).join(',') === 'repair,maintenance,owner_use,other', 'four UI reasons')
assert(blockWriteFromReason('repair', '').type === 'MAINTENANCE', 'repair maps to MAINTENANCE')
assert(blockWriteFromReason('repair', '').reason === 'Ремонт', 'repair default note')
assert(blockWriteFromReason('maintenance', '').type === 'MAINTENANCE', 'maintenance maps to MAINTENANCE')
assert(blockWriteFromReason('owner_use', '').type === 'OWNER_USE', 'owner_use maps to OWNER_USE')
assert(blockWriteFromReason('other', 'вікна').reason === 'вікна', 'custom note is stored')
assert(blockWriteFromReason('repair', 'заміна підлоги').reason === 'заміна підлоги', 'custom note overrides default')
console.log('PASS: reason mapping onto existing RoomBlockType values')

assert(blockedNights('2027-01-05', '2027-01-08').join(',') === '2027-01-05,2027-01-06,2027-01-07', 'three blocked nights')
assert(lastBlockedNight('2027-01-05', '2027-01-08') === '2027-01-07', 'exclusive end is 8 Jan')
assert(formatNightSpanUk('2027-01-05', '2027-01-08') === '5–7 січня 2027 року', 'occupied night span')
assert(formatExclusiveSpanUk('2027-01-05', '2027-01-08') === '5 до 8 січня 2027 року', 'exclusive span')
assert(
  blockConfirmMessage(cottage, '2027-01-05', '2027-01-08') ===
    'Заблокувати Будиночок 1 на 3 ночі: 5–7 січня 2027 року? У цей період нові бронювання будуть недоступні.',
  'block confirmation copy',
)
assert(
  unblockConfirmMessage(cottage, '2027-01-05', '2027-01-08') ===
    'Зняти блокування для «Будиночок 1» з 5 до 8 січня 2027 року?',
  'unblock confirmation copy',
)
assert(blockReasonLabel({ type: 'MAINTENANCE', reason: 'Ремонт' }) === 'Ремонт', 'display repair note')
console.log('PASS: half-open confirmation copy')

const bookingConflict = new ApiError(
  'Період блокування перетинається з активним бронюванням',
  409,
  'ACTIVE_BOOKING_OVERLAP',
  ['2027-01-06', '2027-01-07'],
)
assert(
  blockConflictMessage(bookingConflict) ===
    'Неможливо заблокувати вибрані дати: на цей період вже існує бронювання. Зайняті ночі: 2027-01-06, 2027-01-07.',
  'booking overlap nights without guest data',
)
assert(!blockConflictMessage(bookingConflict).includes('Коваль'), 'no guest name in conflict copy')
const genericBooking = new ApiError('clash', 409, 'ACTIVE_BOOKING_OVERLAP')
assert(
  blockConflictMessage(genericBooking) ===
    'Неможливо заблокувати вибрані дати: на цей період вже існує бронювання.',
  'generic booking overlap copy',
)
console.log('PASS: conflict copy')

for (const role of ['owner', 'admin'] as const) {
  assert(showCalendarBlockButton(role), `${role} sees Заблокувати дати`)
  assert(emptyNightIntent(role) === 'select', `${role} selects a range before acting`)
}
for (const role of ['manager', 'receptionist'] as const) {
  assert(!showCalendarBlockButton(role), `${role} does not see block mutations`)
  assert(emptyNightIntent(role) === 'book', `${role} keeps one-click booking`)
}
assert(!showCalendarBlockButton(undefined), 'signed-out user has no block action')
console.log('PASS: calendar block action follows SUPER_ADMIN and ADMIN')

const free = new Set(['2027-01-05', '2027-01-06', '2027-01-07', '2027-01-09'])
const first = nextNightSelection({ current: null, roomId: 'room-a', date: '2027-01-05', availableDates: free })
assert(first.selection?.endDate === '2027-01-06', 'one click selects one night and an exclusive end')
assert(first.crossedOccupied === false, 'a free night is selectable')
const extended = nextNightSelection({
  current: first.selection,
  roomId: 'room-a',
  date: '2027-01-07',
  availableDates: free,
})
assert(
  extended.selection?.startDate === '2027-01-05' && extended.selection.endDate === '2027-01-08',
  'second click extends the half-open range',
)
const blockedGap = nextNightSelection({
  current: extended.selection,
  roomId: 'room-a',
  date: '2027-01-09',
  availableDates: free,
})
assert(blockedGap.selection?.endDate === '2027-01-08', 'occupied night stops the range')
assert(blockedGap.crossedOccupied, 'crossing an occupied night is reported')
const otherRoom = nextNightSelection({
  current: extended.selection,
  roomId: 'room-b',
  date: '2027-01-09',
  availableDates: free,
})
assert(otherRoom.selection?.roomId === 'room-b' && otherRoom.selection.endDate === '2027-01-10', 'another room starts over')
const occupiedClick = nextNightSelection({
  current: first.selection,
  roomId: 'room-a',
  date: '2027-01-08',
  availableDates: free,
})
assert(occupiedClick.selection?.endDate === '2027-01-06', 'an unavailable night is not selected')
console.log('PASS: chessboard range selection')

const room14 = 'dakh-room-14-3'
const oneNight = nextNightSelection({
  current: null,
  roomId: room14,
  date: '2026-10-24',
  availableDates: new Set(['2026-10-24']),
})
assert(oneNight.selection?.startDate === '2026-10-24' && oneNight.selection.endDate === '2026-10-25', '1. one selected night')
const onePrefill = blockDialogPrefill({ selection: oneNight.selection, today: '2026-10-21' })
assert(onePrefill.roomId === room14 && onePrefill.startDate === '2026-10-24' && onePrefill.endDate === '2026-10-25', '1. dialog copies the single night')

const october = new Set(['2026-10-24', '2026-10-25', '2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29'])
let range = nextNightSelection({ current: null, roomId: room14, date: '2026-10-24', availableDates: october }).selection
range = nextNightSelection({ current: range, roomId: room14, date: '2026-10-29', availableDates: october }).selection
assert(range?.startDate === '2026-10-24' && range.endDate === '2026-10-30', '2. multi-night range keeps an exclusive end')
const rangePrefill = blockDialogPrefill({ selection: range, today: '2026-10-21' })
assert(
  rangePrefill.roomId === room14 && rangePrefill.startDate === '2026-10-24' && rangePrefill.endDate === '2026-10-30',
  '2. dialog receives 24 Oct through exclusive 30 Oct',
)
assert(rangePrefill.startDate !== '2026-10-25' && rangePrefill.endDate !== '2026-10-25', '2. dialog does not collapse to 25 Oct')
assert(blockedNights(rangePrefill.startDate, rangePrefill.endDate).length === 6, '3. exclusive end covers six nights, not the 30th')
assert(
  blockConfirmMessage({ name: null, number: room14 }, rangePrefill.startDate, rangePrefill.endDate).includes('6 ночей'),
  '10. confirmation counts six nights',
)

const monthSpan = {
  roomId: room14,
  startDate: '2026-10-30',
  endDate: '2026-11-02',
}
const monthPrefill = blockDialogPrefill({ selection: monthSpan, today: '2026-10-21' })
assert(monthPrefill.startDate === '2026-10-30' && monthPrefill.endDate === '2026-11-02', '4. month boundary is not shifted')
assert(blockedNights(monthPrefill.startDate, monthPrefill.endDate).join(',') === '2026-10-30,2026-10-31,2026-11-01', '4. nights cross into November')

assert(rangePrefill.roomId === room14, '5. room id is the selected physical room')
const blank = blockDialogPrefill({ selection: null, today: '2026-10-21' })
assert(blank.roomId === '' && blank.startDate === '2026-10-21' && blank.endDate === '2026-10-22', '6. toolbar without a selection is one valid night')
assert(blank.endDate > blank.startDate, '6. default end is later than the start')
const other = blockDialogPrefill({
  selection: { roomId: 'cottage-9', startDate: '2026-11-03', endDate: '2026-11-05' },
  today: '2026-10-21',
})
assert(other.roomId === 'cottage-9' && other.startDate === '2026-11-03' && other.roomId !== rangePrefill.roomId, '7. a later open uses the new room')

assert(addCalendarDays('2026-10-24', 1) === '2026-10-25', '8. 24 Oct plus one calendar day is 25 Oct')
assert(addCalendarDays('2026-10-25', 1) === '2026-10-26', '8. the 25 Oct boundary does not shift a day')
assert(addCalendarDays('2026-10-24', 6) === '2026-10-30', '8. six calendar days reach the exclusive end')
assert(repairBlockEndDate('2026-10-25', '2026-10-25') === '2026-10-26', 'start change cannot leave an equal end')
assert(repairBlockEndDate('2026-10-24', '2026-10-30') === '2026-10-30', 'a valid exclusive end is not moved')

const booking = bookingQueryFromSelection(range!)
assert(booking.roomId === room14 && booking.checkIn === '2026-10-24' && booking.checkOut === '2026-10-30', '9. booking uses the same exclusive end')
console.log('PASS: block dialog prefill')

const hotelHooks = readFileSync(new URL('../hooks/useHotel.ts', import.meta.url), 'utf8')
assert(hotelHooks.includes('useCreateAdminRoomBlock'), 'create block hook exists')
assert(hotelHooks.includes('useDeleteAdminRoomBlock'), 'delete block hook exists')
assert(
  hotelHooks.includes("invalidateQueries({ queryKey: ['admin-calendar'] })"),
  'block refresh invalidates the admin calendar',
)
const calendarPage = readFileSync(new URL('../pages/calendar/CalendarPage.tsx', import.meta.url), 'utf8')
assert(calendarPage.includes('Заблокувати дати'), 'calendar toolbar names the block action')
assert(calendarPage.includes('Створити бронювання'), 'selected range can still create a booking')
assert(calendarPage.includes('showCalendarBlockButton'), 'toolbar uses the shared role check')
console.log('PASS: calendar wiring and query invalidation')

console.log('All room-block checks passed.')
