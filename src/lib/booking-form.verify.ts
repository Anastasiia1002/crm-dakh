/**
 * Reception booking form rules: phone lookup, validation, calendar boundaries.
 * Run: npx --yes tsx src/lib/booking-form.verify.ts
 */
import { applyGuestFill, createSubmitLock, hasFieldErrors, proposeGuestFill, validateGuestFields, validateStayFields } from './booking-form'
import { normalizePhone, phonesMatch } from './phone'
import {
  checkInPolicyError,
  kyivTodayIso,
  monthGrid,
  selectStayDate,
  stayNightsAvailable,
  type BookingWindowRules,
  type NightAvailability,
} from './stay-calendar'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

const rules: BookingWindowRules = {
  timeZone: 'Europe/Kyiv',
  minAdvanceHours: 0,
  maxAdvanceDays: 365,
  allowSameDayBooking: true,
  defaultMinStay: 1,
  defaultMaxStay: null,
}

function nights(entries: Array<[string, NightAvailability]>) {
  return new Map(entries)
}

function main() {
  const local = normalizePhone('050 111 22 33')
  assert(local.ok && local.e164 === '+380501112233', 'ukraine local to e164')
  const intl = normalizePhone('+380501112233')
  assert(intl.ok && intl.searchKey === '501112233', 'search key is national number')
  assert(phonesMatch('0501112233', '+380501112233'), 'stored local matches e164')
  assert(phonesMatch('+38 (050) 111-22-33', '+380501112233'), 'formatted stored phone matches')
  assert(!phonesMatch('+380671112233', '+380501112233'), 'different phone is not a match')
  assert(!normalizePhone('').ok, 'empty phone invalid')
  assert(!normalizePhone('abc').ok, 'letters invalid')
  console.log('PASS: phone normalization and match')

  const one = { id: 'g1', firstName: 'Олена', lastName: 'Коваль', phone: '0501112233', email: 'olena@dakh.test' }
  const two = { id: 'g2', firstName: 'Ігор', lastName: 'Мельник', phone: '+380501112233', email: '' }
  assert(phonesMatch(one.phone, '+380501112233') && phonesMatch(two.phone, '+380501112233'), 'two cards match one number')
  const empty = { firstName: '', lastName: '', phone: '+380501112233', email: '' }
  const filled = proposeGuestFill(empty, one)
  assert(filled.conflicts.length === 0 && filled.fields.firstName === 'Олена', 'empty fields autofill')
  const edited = proposeGuestFill({ ...empty, firstName: 'Марія' }, one)
  assert(edited.conflicts.includes('firstName') && edited.fields.firstName === 'Марія', 'edited name is not overwritten')
  const replaced = applyGuestFill({ ...empty, firstName: 'Марія' }, one, true)
  assert(replaced.firstName === 'Олена', 'replace only after confirmation')
  console.log('PASS: guest match selection')

  const guestErrors = validateGuestFields({ firstName: 'А', lastName: '', phone: '123', email: 'not-an-email' })
  assert(Boolean(guestErrors.phone && guestErrors.firstName && guestErrors.lastName && guestErrors.email), 'invalid phone name email')
  const missing = validateStayFields({
    checkIn: '',
    checkOut: '',
    roomId: '',
    roomActive: true,
    ratePlanId: '',
    guestCount: 0,
    maxGuests: 2,
    notes: '',
    rules,
    nights: null,
  })
  assert(Boolean(missing.checkIn && missing.checkOut && missing.roomId && missing.guestCount), 'missing required stay fields')
  console.log('PASS: invalid and missing fields')

  const now = new Date('2026-10-19T10:00:00+03:00')
  assert(kyivTodayIso(now) === '2026-10-19', 'kyiv today')
  assert(checkInPolicyError('2026-10-19', rules, now) === null, 'same-day check-in allowed')
  assert(checkInPolicyError('2026-10-19', { ...rules, allowSameDayBooking: false }, now) !== null, 'same-day disabled by policy')

  const free = nights([
    ['2026-10-19', 'free'],
    ['2026-10-20', 'occupied'],
  ])
  const sameDay = selectStayDate({
    currentCheckIn: '',
    currentCheckOut: '',
    clicked: '2026-10-19',
    nights: free,
    rules,
    now,
  })
  assert(sameDay.checkIn === '2026-10-19' && sameDay.error === null, 'same-day night can start a stay')
  const checkoutNext = selectStayDate({
    currentCheckIn: '2026-10-19',
    currentCheckOut: '',
    clicked: '2026-10-20',
    nights: free,
    rules,
    now,
  })
  assert(checkoutNext.checkOut === '2026-10-20' && checkoutNext.error === null, 'checkout morning may fall on an occupied night')
  assert(stayNightsAvailable('2026-10-19', '2026-10-20', free), 'only the free night is occupied by the stay')
  const overlap = selectStayDate({
    currentCheckIn: '2026-10-19',
    currentCheckOut: '',
    clicked: '2026-10-21',
    nights: free,
    rules,
    now,
  })
  assert(overlap.error !== null && overlap.checkOut === '', 'range through an occupied night is rejected')
  const blocked = selectStayDate({
    currentCheckIn: '',
    currentCheckOut: '',
    clicked: '2026-10-20',
    nights: free,
    rules,
    now,
  })
  assert(blocked.error !== null, 'occupied night cannot be check-in')
  console.log('PASS: occupied dates, same-day stay, checkout boundary')

  const october = monthGrid('2026-10')
  assert(october.length === 42, 'month grid is six weeks')
  assert(october[0] <= '2026-10-01' && october[october.length - 1] >= '2026-10-31', 'grid covers the month')
  assert(new Date(`${october[0]}T00:00:00Z`).getUTCDay() === 1, 'grid starts on Monday')
  console.log('PASS: month grid')

  const lock = createSubmitLock()
  assert(lock.tryBegin() === true, 'first submit starts')
  assert(lock.tryBegin() === false, 'second submit is ignored')
  lock.end()
  assert(lock.tryBegin() === true, 'submit can start after the first finishes')
  console.log('PASS: duplicate submit')

  assert(!hasFieldErrors(validateGuestFields({ firstName: 'Олена', lastName: 'Коваль', phone: '+380501112233', email: '' })), 'valid guest')
  console.log('All booking form checks passed.')
}

main()
