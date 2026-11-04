/**
 * Operational date rules. Run: npx --yes tsx src/lib/operations-board.verify.ts
 */
import { readFileSync } from 'node:fs'
import { occupancyForNight, sellablePercent, splitStayOperations, bookingsOnHotelDate, stayCoversNight, attentionBookings, matchesOperationSearch, movementWindow, timestampWindow, operationPageDecision } from './operations-board'
import type { OperationBooking } from './operations-board'
import type { AdminCalendarView } from '@/types'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

const booking = (patch: Partial<OperationBooking> & Pick<OperationBooking, 'id' | 'status' | 'checkIn' | 'checkOut'>): OperationBooking => ({
  createdAt: '2026-11-03T22:30:00.000Z',
  cancelledAt: null,
  guestName: 'Олена Коваль',
  accommodation: '101',
  ...patch,
})

function main() {
  const date = '2026-11-04'
  assert(movementWindow(date).checkIn === '2026-11-03' && movementWindow(date).checkOut === '2026-11-05', 'movement window covers the night and both edges')
  assert(timestampWindow(date).from === '2026-11-03' && timestampWindow(date).to === '2026-11-06', 'timestamp window is widened around the hotel date')
  assert(stayCoversNight('2026-11-04', '2026-11-04', date) === false, 'a same-timestamp stay does not occupy the night')
  assert(stayCoversNight('2026-11-01', '2026-11-04', date) === false, 'checkout morning is not still in house')
  assert(stayCoversNight('2026-11-04', '2026-11-05', date), 'arrival night is in house')

  const rows = [
    booking({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', status: 'CONFIRMED', checkIn: '2026-11-04', checkOut: '2026-11-06' }),
    booking({ id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', status: 'CHECKED_IN', checkIn: '2026-11-02', checkOut: '2026-11-04', guestName: 'Ігор Мельник' }),
    booking({ id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', status: 'CANCELLED', checkIn: '2026-11-04', checkOut: '2026-11-07' }),
    booking({ id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', status: 'PENDING', checkIn: '2026-11-04', checkOut: '2026-11-05', guestName: 'Марія' }),
    booking({ id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', status: 'CHECKED_OUT', checkIn: '2026-11-03', checkOut: '2026-11-04' }),
  ]
  const split = splitStayOperations(rows, date)
  assert(split.inHouse.map((item) => item.id[0]).join('') === 'ad', 'in-house is bookings on the night, not cancelled')
  assert(split.arrivals.map((item) => item.id[0]).join('') === 'ad', 'arrivals exclude cancelled and no-show')
  assert(split.departures.map((item) => item.id[0]).join('') === 'be', 'departures keep confirmed, checked-in, and checked-out')
  assert(attentionBookings(split.inHouse, split.arrivals).map((item) => item.id[0]).join('') === 'd', 'attention is pending only')

  const created = bookingsOnHotelDate(
    [booking({ id: '1', status: 'CONFIRMED', checkIn: '2026-12-01', checkOut: '2026-12-02', createdAt: '2026-11-03T22:30:00.000Z' })],
    date,
    'Europe/Kyiv',
    'createdAt',
  )
  assert(created.length === 1, '22:30Z is 00:30 in Kyiv on the selected date')
  const cancelled = bookingsOnHotelDate(
    [booking({ id: '2', status: 'CANCELLED', checkIn: '2026-12-01', checkOut: '2026-12-02', cancelledAt: '2026-11-04T22:30:00.000Z' })],
    date,
    'Europe/Kyiv',
    'cancelledAt',
  )
  assert(cancelled.length === 0, '22:30Z is already the next Kyiv date')

  const calendar: AdminCalendarView = {
    from: date,
    to: '2026-11-05',
    roomTypes: [
      {
        roomTypeId: 'type',
        name: 'Номер',
        rooms: [
          { roomId: 'a', number: '1', status: 'AVAILABLE', active: true, nights: [{ date, state: 'BOOKED', bookingId: 'x', blockId: null }] },
          { roomId: 'b', number: '2', status: 'AVAILABLE', active: true, nights: [{ date, state: 'AVAILABLE', bookingId: null, blockId: null }] },
          { roomId: 'c', number: '3', status: 'AVAILABLE', active: true, nights: [{ date, state: 'BLOCKED', bookingId: null, blockId: 'block' }] },
          { roomId: 'd', number: '4', status: 'OUT_OF_ORDER', active: true, nights: [{ date, state: 'OUT_OF_ORDER', bookingId: null, blockId: null }] },
          { roomId: 'e', number: '5', status: 'AVAILABLE', active: false, nights: [{ date, state: 'INACTIVE', bookingId: null, blockId: null }] },
        ],
      },
    ],
  }
  const occupancy = occupancyForNight(calendar, date)
  assert(occupancy.occupied === 1 && occupancy.available === 1 && occupancy.blocked === 1, 'occupied, free, and blocked are separate')
  assert(occupancy.sellable === 2 && occupancy.percent === '50.00', 'out of order and inactive units are outside sellable occupancy')
  assert(sellablePercent(0, 0) === null, 'no sellable units has no percent')
  assert(matchesOperationSearch(rows[0]!, 'aaaaaaaa'), 'search matches the booking reference prefix')
  assert(operationPageDecision(1, 1, 20) === 'done', 'a short page is a complete list')
  assert(operationPageDecision(1, 0, 0) === 'done', 'an empty page is complete')
  assert(operationPageDecision(4, 8, 100) === 'next', 'pages inside the cap continue')
  assert(operationPageDecision(5, 8, 100) === 'truncated', 'the cap keeps the loaded rows and marks them partial')
  assert(operationPageDecision(5, 5, 40) === 'done', 'the last page inside the cap is complete')

  const hook = readFileSync(new URL('../hooks/useOperationsBoard.ts', import.meta.url), 'utf8')
  const board = readFileSync(new URL('../components/dashboard/OperationsBoard.tsx', import.meta.url), 'utf8')
  assert(hook.includes('complete: false') && !hook.includes('OPERATIONS_WINDOW_TOO_LARGE'), 'a truncated list is returned, not discarded')
  assert(hook.includes('cancelledFrom: date'), 'cancellation filter asks for the selected hotel date')
  assert(board.includes('Лічильник і пошук неповні'), 'a partial list is labeled incomplete')
  assert(board.includes('occupancyForNight'), 'selected-date occupancy comes from the calendar night')
  console.log('PASS: operations board date rules')
}

main()
