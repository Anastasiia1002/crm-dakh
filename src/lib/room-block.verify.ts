/**
 * Date-blocking copy, reason mapping, and conflict messages.
 * Run: npx --yes tsx src/lib/room-block.verify.ts
 */
import { readFileSync } from 'node:fs'
import { ApiError } from './api-error'
import { emptyNightIntent, nextNightSelection, showCalendarBlockButton } from './calendar-selection'
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
