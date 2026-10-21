/**
 * Date-blocking copy, reason mapping, and conflict messages.
 * Run: npx --yes tsx src/lib/room-block.verify.ts
 */
import { ApiError } from './api-error'
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

console.log('All room-block checks passed.')
