/**
 * Booking edit, move, price difference, and status occupancy rules.
 * Run: npx --yes tsx src/lib/booking-manage.verify.ts
 */
import { adminBookingStatusActions, canReassignAdminBookingRoom } from './admin-booking-view'
import { createSubmitLock } from './booking-form'
import { roomsOfferedForStay, statusOccupancyImpact, stayPriceDifference } from './booking-manage'
import { roomNightMap, selectStayDate, stayNightsAvailable, type BookingWindowRules } from './stay-calendar'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

const rules: BookingWindowRules = {
  timeZone: 'Europe/Kyiv',
  minAdvanceHours: 0,
  maxAdvanceDays: null,
  allowSameDayBooking: true,
  defaultMinStay: 1,
  defaultMaxStay: null,
}
const now = new Date('2026-10-19T10:00:00+03:00')
const own = 'booking-own'
const other = 'booking-other'

const calendar = [
  {
    rooms: [
      {
        roomId: 'room-a',
        nights: [
          { date: '2026-10-20', state: 'BOOKED' as const, bookingId: own },
          { date: '2026-10-21', state: 'BOOKED' as const, bookingId: own },
          { date: '2026-10-22', state: 'BOOKED' as const, bookingId: other },
        ],
      },
      {
        roomId: 'room-b',
        nights: [
          { date: '2026-10-20', state: 'AVAILABLE' as const, bookingId: null },
          { date: '2026-10-21', state: 'AVAILABLE' as const, bookingId: null },
          { date: '2026-10-22', state: 'BLOCKED' as const, bookingId: null },
        ],
      },
      {
        roomId: 'room-c',
        nights: [
          { date: '2026-10-20', state: 'AVAILABLE' as const, bookingId: null },
          { date: '2026-10-21', state: 'BOOKED' as const, bookingId: other },
          { date: '2026-10-22', state: 'AVAILABLE' as const, bookingId: null },
        ],
      },
    ],
  },
]

const ownNights = roomNightMap(calendar, 'room-a', own)
assert(stayNightsAvailable('2026-10-20', '2026-10-22', ownNights), 'own stay can be kept or shortened')
assert(!stayNightsAvailable('2026-10-20', '2026-10-23', ownNights), 'extension into another booking is refused')
assert(stayNightsAvailable('2026-10-20', '2026-10-21', ownNights), 'shortening stays inside owned nights')
const checkoutOnOccupied = selectStayDate({
  currentCheckIn: '2026-10-20',
  currentCheckOut: '',
  clicked: '2026-10-22',
  nights: ownNights,
  rules,
  now,
})
assert(checkoutOnOccupied.checkOut === '2026-10-22' && checkoutOnOccupied.error === null, 'checkout morning may be an occupied night')
assert(!roomNightMap(calendar, 'room-a').get('2026-10-20') || roomNightMap(calendar, 'room-a').get('2026-10-20') === 'occupied', 'without exclusion the stay looks occupied')
console.log('PASS: edit, extend, shorten, checkout boundary')

const capacity = new Map([
  ['room-a', 2],
  ['room-b', 4],
  ['room-c', 2],
])
const nightsByRoom = new Map([
  ['room-a', ownNights],
  ['room-b', roomNightMap(calendar, 'room-b', own)],
  ['room-c', roomNightMap(calendar, 'room-c', own)],
])
const offered = roomsOfferedForStay({
  roomIds: ['room-a', 'room-b', 'room-c'],
  nightsByRoom,
  checkIn: '2026-10-20',
  checkOut: '2026-10-22',
  guestCount: 2,
  capacityByRoom: capacity,
  selectedRoomId: 'room-a',
})
assert(offered.includes('room-a') && offered.includes('room-b') && !offered.includes('room-c'), 'only the current room and a free compatible room are offered')
const tooMany = roomsOfferedForStay({
  roomIds: ['room-a', 'room-b'],
  nightsByRoom,
  checkIn: '2026-10-20',
  checkOut: '2026-10-22',
  guestCount: 5,
  capacityByRoom: capacity,
  selectedRoomId: 'room-a',
})
assert(tooMany.includes('room-a') && !tooMany.includes('room-b'), 'a room below capacity is not offered')
console.log('PASS: accommodation move and capacity')

const difference = stayPriceDifference('200.20', '300.30')
assert(difference?.increased === true && difference.delta === '100.10', 'price increase')
const decrease = stayPriceDifference('300.30', '100.10')
assert(decrease?.increased === false && decrease.delta === '-200.20', 'price decrease')
assert(stayPriceDifference('190.28', '190.28')?.same === true, 'unchanged price')
assert(stayPriceDifference('10', '20.00') === null, 'malformed money is not invented')
console.log('PASS: pricing difference')

assert(adminBookingStatusActions('CHECKED_OUT').length === 0, 'checked-out has no transition')
assert(adminBookingStatusActions('CANCELLED').length === 0, 'cancelled has no transition')
assert(adminBookingStatusActions('NO_SHOW').length === 0, 'no-show has no transition')
assert(!adminBookingStatusActions('CHECKED_IN').includes('cancel'), 'checked-in cannot be cancelled')
assert(adminBookingStatusActions('CONFIRMED').includes('check-in'), 'confirmed can check in')
assert(statusOccupancyImpact('cancel').includes('звільн'), 'cancel explains occupancy')
assert(statusOccupancyImpact('check-out').includes('звільн'), 'check-out explains occupancy')
assert(statusOccupancyImpact('check-in').includes('зайнятими'), 'check-in keeps occupancy')
assert(canReassignAdminBookingRoom('receptionist') === false, 'receptionist cannot move a room')
assert(canReassignAdminBookingRoom('manager') === true, 'manager can move a room')
console.log('PASS: status transitions and authorization')

const lock = createSubmitLock()
assert(lock.tryBegin() && !lock.tryBegin(), 'duplicate status action is ignored')
console.log('PASS: duplicate submit')
console.log('All booking management checks passed.')
