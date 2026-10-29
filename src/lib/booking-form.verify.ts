/**
 * Reception booking form rules: phone lookup, validation, calendar boundaries.
 * Run: npx --yes tsx src/lib/booking-form.verify.ts
 */
import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { StayCalendar } from '../components/bookings/StayCalendar'
import type { AdminBookingDetail } from '@/types'
import { buildAdminBookingUpdateInput, canEditAdminBookingCommercial } from './admin-booking-view'
import { applyGuestFill, createSubmitLock, hasFieldErrors, proposeGuestFill, validateGuestFields, validateStayFields } from './booking-form'
import { normalizePhone, phonesMatch } from './phone'
import {
  checkInPolicyError,
  kyivTodayIso,
  monthGrid,
  reconcileStayDates,
  selectStayDate,
  stayDateDisabled,
  stayNightsAvailable,
  storedStayDatesUnchanged,
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

  const pastClick = selectStayDate({
    currentCheckIn: '2026-10-19',
    currentCheckOut: '2026-10-20',
    clicked: '2026-10-18',
    nights: free,
    rules,
    now,
  })
  assert(pastClick.error !== null && pastClick.checkIn === '2026-10-19' && pastClick.checkOut === '2026-10-20', 'past date does not change the selection')
  assert(stayDateDisabled('2026-10-18', '2026-10-19', true) === 'past', 'yesterday is past')
  assert(stayDateDisabled('2026-10-19', '2026-10-19', true) === null, 'today stays selectable')
  assert(stayDateDisabled('2026-10-19', '2026-10-19', false) === 'same-day', 'today closes when same-day booking is off')
  const equalCheckout = selectStayDate({
    currentCheckIn: '2026-10-19',
    currentCheckOut: '',
    clicked: '2026-10-19',
    nights: free,
    rules,
    now,
  })
  assert(equalCheckout.checkOut === '' && equalCheckout.checkIn === '2026-10-19', 'checkout cannot equal check-in')
  const pastSubmit = validateStayFields({
    checkIn: '2026-10-18',
    checkOut: '2026-10-20',
    roomId: 'room-1',
    roomActive: true,
    ratePlanId: 'plan-1',
    guestCount: 2,
    maxGuests: 2,
    notes: '',
    rules,
    nights: free,
    now,
  })
  assert(Boolean(pastSubmit.checkIn), 'submit revalidates a past check-in')
  const stored = { checkIn: '2026-10-10', checkOut: '2026-10-12' }
  assert(storedStayDatesUnchanged(stored, stored.checkIn, stored.checkOut), 'stored dates are unchanged')
  assert(!storedStayDatesUnchanged(null, stored.checkIn, stored.checkOut), 'a new booking has no stored stay')
  const keptHistorical = reconcileStayDates({
    checkIn: stored.checkIn,
    checkOut: stored.checkOut,
    stored,
    policyError: 'Дата заїзду не може бути в минулому.',
  })
  assert(keptHistorical.checkIn === stored.checkIn && keptHistorical.checkOut === stored.checkOut && keptHistorical.error === null, 'opening a stored stay does not clear historical dates')
  const clearedCreate = reconcileStayDates({
    checkIn: '2026-10-18',
    checkOut: '2026-10-20',
    stored: null,
    policyError: 'Дата заїзду не може бути в минулому.',
  })
  assert(clearedCreate.checkIn === '' && clearedCreate.checkOut === '' && clearedCreate.error !== null, 'a new past check-in is cleared')
  const restoredEdit = reconcileStayDates({
    checkIn: '2026-10-18',
    checkOut: '2026-10-20',
    stored,
    policyError: 'Дата заїзду не може бути в минулому.',
  })
  assert(restoredEdit.checkIn === stored.checkIn && restoredEdit.checkOut === stored.checkOut && restoredEdit.error !== null, 'an invalid date change returns to the stored stay')
  const unchangedStay = validateStayFields({
    checkIn: stored.checkIn,
    checkOut: stored.checkOut,
    roomId: 'room-1',
    roomActive: true,
    ratePlanId: 'plan-1',
    guestCount: 2,
    maxGuests: 2,
    notes: 'примітка',
    rules: storedStayDatesUnchanged(stored, stored.checkIn, stored.checkOut) ? null : rules,
    nights: null,
    now,
  })
  assert(!unchangedStay.checkIn && !unchangedStay.checkOut, 'saving an unchanged historical stay skips the booking window')
  assert(canEditAdminBookingCommercial('CHECKED_IN') === false, 'checked-in stays do not use the commercial calendar')
  console.log('PASS: historical stays stay intact while new past check-ins are rejected')
  const afterMidnight = new Date('2026-10-20T00:30:00+03:00')
  assert(kyivTodayIso(afterMidnight) === '2026-10-20', 'hotel date moves at Kyiv midnight')
  const stale = selectStayDate({
    currentCheckIn: '',
    currentCheckOut: '',
    clicked: '2026-10-19',
    nights: free,
    rules,
    now: afterMidnight,
  })
  assert(stale.error !== null && stale.checkIn === '', 'a date selected before midnight is past after midnight')
  const winter = new Date('2026-01-15T22:30:00.000Z')
  const summer = new Date('2026-06-15T21:30:00.000Z')
  assert(kyivTodayIso(winter) === '2026-01-16', 'winter offset uses the next hotel date before UTC midnight')
  assert(kyivTodayIso(summer) === '2026-06-16', 'summer offset uses the next hotel date before UTC midnight')
  assert(stayDateDisabled('2026-01-15', kyivTodayIso(winter), true) === 'past', 'utc today can already be past in winter')
  const yearTurn = new Date('2026-12-31T22:30:00.000Z')
  assert(kyivTodayIso(yearTurn) === '2027-01-01', 'year boundary uses the hotel date')
  assert(stayDateDisabled('2026-12-31', kyivTodayIso(yearTurn), true) === 'past', 'previous year date is closed after the hotel new year')
  const previousMonth = monthGrid('2026-09')
  assert(previousMonth.some((date) => date.startsWith('2026-09-') && stayDateDisabled(date, '2026-10-01', true) === 'past'), 'previous month contains past dates')
  assert(stayDateDisabled('2026-10-01', '2026-10-01', true) === null, 'first day of the month stays open')
  console.log('PASS: past dates, midnight, month and year boundaries')

  const calendarHtml = renderToStaticMarkup(
    createElement(StayCalendar, {
      month: '2026-10',
      accommodationName: 'Номер',
      checkIn: '2026-10-20',
      checkOut: '2026-10-22',
      nights: nights([
        ['2026-10-20', 'free'],
        ['2026-10-25', 'occupied'],
        ['2026-10-26', 'blocked'],
      ]),
      today: '2026-10-19',
      allowSameDay: true,
      loading: false,
      error: null,
      onMonthChange: () => undefined,
      onSelect: () => undefined,
    }),
  )
  const pastButton = calendarHtml.match(/<button[^>]*aria-label="2026-10-18, минула дата"[^>]*>/)?.[0] ?? ''
  const todayButton = calendarHtml.match(/<button[^>]*aria-label="2026-10-19, blocked"[^>]*>/)?.[0] ?? ''
  const selectedButton = calendarHtml.match(/<button[^>]*aria-label="2026-10-20, free"[^>]*>/)?.[0] ?? ''
  const occupiedButton = calendarHtml.match(/<button[^>]*aria-label="2026-10-25, occupied"[^>]*>/)?.[0] ?? ''
  assert(pastButton.includes('disabled=""') && pastButton.includes('cursor-not-allowed') && pastButton.includes('aria-disabled="true"'), 'past date is muted and disabled')
  assert(!todayButton.includes('disabled=""'), 'today remains selectable')
  assert(selectedButton.includes('bg-primary') && !selectedButton.includes('disabled=""'), 'selected date stays distinct')
  assert(occupiedButton.includes('bg-[#e7d4cf]') && !occupiedButton.includes('disabled=""'), 'occupied date stays distinct and clickable')
  assert(calendarHtml.includes('Минула дата'), 'legend names past dates')
  const historicalHtml = renderToStaticMarkup(
    createElement(StayCalendar, {
      month: '2026-10',
      accommodationName: 'Номер',
      checkIn: '2026-10-10',
      checkOut: '2026-10-12',
      nights: nights([]),
      today: '2026-10-19',
      allowSameDay: true,
      loading: false,
      error: null,
      onMonthChange: () => undefined,
      onSelect: () => undefined,
    }),
  )
  const historicalCheckIn = historicalHtml.match(/<button[^>]*aria-label="2026-10-10, минула дата"[^>]*>/)?.[0] ?? ''
  assert(historicalCheckIn.includes('disabled=""') && historicalCheckIn.includes('bg-primary'), 'a stored past check-in stays visible and cannot be reselected')
  console.log('PASS: calendar cell states')

  const detail = readFileSync(new URL('../pages/bookings/BookingDetailPage.tsx', import.meta.url), 'utf8')
  assert(!detail.includes('Місто / країна'), 'booking detail does not present city and country')
  assert(detail.includes('Телефон') && detail.includes('Електронна пошта'), 'guest contact stays on the booking detail')
  assert(detail.includes('formatDate(booking.checkIn)') && detail.includes('formatDate(booking.checkOut)'), 'booking detail shows the stored dates')
  assert(!detail.includes('StayCalendar') && !detail.includes('stayDateDisabled'), 'booking detail does not apply the past-date calendar')
  const formSource = readFileSync(new URL('../components/bookings/AdminBookingForm.tsx', import.meta.url), 'utf8')
  assert(formSource.includes('storedStayDatesUnchanged'), 'the edit form keeps an unchanged stored stay')
  console.log('PASS: guest city and country hidden on booking detail')

  const historicalBooking: AdminBookingDetail = {
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
    notes: 'стара примітка',
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
    services: [],
    price: {
      roomSubtotal: '2400.00',
      servicesTotal: '0.00',
      discountAmount: '0.00',
      taxAmount: '0.00',
      totalAmount: '2400.00',
      currency: 'UAH',
    },
    totalAmount: '2400.00',
    currency: 'UAH',
  }
  const notesOnly = buildAdminBookingUpdateInput({
    booking: historicalBooking,
    role: 'admin',
    guestMode: 'keep',
    guestId: historicalBooking.guest.id,
    guest: {
      firstName: historicalBooking.guest.firstName,
      lastName: historicalBooking.guest.lastName,
      phone: historicalBooking.guest.phone ?? '',
      email: historicalBooking.guest.email ?? '',
    },
    checkIn: historicalBooking.checkIn,
    checkOut: historicalBooking.checkOut,
    adults: historicalBooking.adults,
    children: historicalBooking.children,
    roomId: 'r1',
    ratePlanId: 'p1',
    notes: 'оновлена примітка',
  })
  assert(!('error' in notesOnly), 'notes can be saved on a historical stay')
  if (!('error' in notesOnly)) {
    assert(notesOnly.checkIn === undefined && notesOnly.checkOut === undefined, 'an unchanged historical stay is not sent as a date change')
    assert(notesOnly.notes === 'оновлена примітка', 'only the notes change is sent')
  }
  console.log('PASS: historical booking update omits dates')

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
