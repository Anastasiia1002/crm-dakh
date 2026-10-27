/**
 * Dependency-free scenario checks for the chessboard adapter.
 * Run: npx --yes tsx src/lib/calendar-adapter.verify.ts
 *
 * Auto-runs when this file is the tsx entrypoint.
 */
import { buildChessboardModel, stitchAdminSpans, stitchBookingSpans } from './calendar-adapter'
import type { AdminCalendarNight, AdminCalendarView, AdminBookingListItem } from '@/types'

function night(
  date: string,
  state: AdminCalendarNight['state'],
  bookingId: string | null = null,
  blockId: string | null = null,
): AdminCalendarNight {
  return { date, state, bookingId, blockId }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

function bookingMeta(id: string, roomIds: string[], status: AdminBookingListItem['status']): AdminBookingListItem {
  return {
    id,
    status,
    source: 'ADMIN',
    checkIn: '2026-10-10',
    checkOut: '2026-10-13',
    adults: 2,
    children: 0,
    guestCount: 2,
    promoCodeId: null,
    createdAt: '2026-10-01T00:00:00.000Z',
    guest: {
      id: 'g1',
      firstName: 'Іван',
      lastName: 'Коваль',
      email: null,
      phone: null,
      country: null,
      city: null,
    },
    rooms: roomIds.map((roomId) => ({
      roomId,
      number: roomId,
      roomTypeId: 'rt1',
      roomTypeName: 'Standard',
      ratePlanId: 'rp1',
    })),
    totalAmount: '1000.00',
    currency: 'UAH',
  }
}

export function runCalendarAdapterChecks(): string[] {
  const results: string[] = []

  // A — checkout night not occupied; bar ends at checkout date (half-open)
  const spanA = stitchBookingSpans([
    night('2026-10-10', 'BOOKED', 'b1'),
    night('2026-10-11', 'BOOKED', 'b1'),
    night('2026-10-12', 'BOOKED', 'b1'),
  ])
  assert(spanA.length === 1, 'A: one span')
  assert(spanA[0].startDate === '2026-10-10', 'A: start')
  assert(spanA[0].endDate === '2026-10-13', 'A: end exclusive = checkout')
  results.push('A PASS: Oct 10–13 booking occupies 10/11/12; endDate=13')

  // C — nonconsecutive nights do not bridge
  const spanC = stitchBookingSpans([
    night('2026-10-10', 'BOOKED', 'b1'),
    night('2026-10-11', 'AVAILABLE'),
    night('2026-10-12', 'BOOKED', 'b1'),
  ])
  assert(spanC.length === 2, 'C: two spans')
  assert(spanC[0].endDate === '2026-10-11' && spanC[1].startDate === '2026-10-12', 'C: gap kept')
  results.push('C PASS: nonconsecutive same bookingId → two bars')

  // G — admin block clipped to visible nights
  const spanG = stitchAdminSpans([
    night('2026-10-10', 'BLOCKED', null, 'blk1'),
    night('2026-10-11', 'BLOCKED', null, 'blk1'),
  ])
  assert(spanG.length === 1 && spanG[0].endDate === '2026-10-12', 'G: block span')
  results.push('G PASS: block bar covers only visible blocked nights')

  const calendar: AdminCalendarView = {
    from: '2026-10-10',
    to: '2026-10-14',
    roomTypes: [
      {
        roomTypeId: 'rt1',
        name: 'Standard',
        rooms: [
          {
            roomId: 'room-a',
            number: '101',
            status: 'AVAILABLE',
            active: true,
            nights: [
              night('2026-10-10', 'BOOKED', 'b-multi'),
              night('2026-10-11', 'BOOKED', 'b-multi'),
              night('2026-10-12', 'CHECKED_IN', 'b-multi'),
              night('2026-10-13', 'AVAILABLE'),
            ],
          },
          {
            roomId: 'room-b',
            number: '102',
            status: 'AVAILABLE',
            active: true,
            nights: [
              night('2026-10-10', 'BOOKED', 'b-multi'),
              night('2026-10-11', 'BOOKED', 'b-multi'),
              night('2026-10-12', 'BOOKED', 'b-multi'),
              night('2026-10-13', 'MAINTENANCE', null, 'blk2'),
            ],
          },
          {
            roomId: 'room-c',
            number: '103',
            status: 'AVAILABLE',
            active: true,
            nights: [
              night('2026-10-10', 'BOOKED', 'b-missing'),
              night('2026-10-11', 'OUT_OF_ORDER'),
              night('2026-10-12', 'INACTIVE'),
              night('2026-10-13', 'BLOCKED', null, 'blk3'),
            ],
          },
        ],
      },
      {
        roomTypeId: 'rt-cottage',
        name: 'House',
        rooms: [
          {
            roomId: 'cottage-1',
            number: 'H1',
            status: 'AVAILABLE',
            active: true,
            nights: [
              night('2026-10-10', 'AVAILABLE'),
              night('2026-10-11', 'AVAILABLE'),
              night('2026-10-12', 'AVAILABLE'),
              night('2026-10-13', 'AVAILABLE'),
            ],
          },
        ],
      },
    ],
  }

  // B — multi-room same booking id
  const modelB = buildChessboardModel({
    calendar,
    roomTypeMeta: [
      { id: 'rt1', kind: 'ROOM', name: 'Standard' },
      { id: 'rt-cottage', kind: 'COTTAGE', name: 'House' },
    ],
    bookings: [bookingMeta('b-multi', ['room-a', 'room-b'], 'CONFIRMED')],
    kindFilter: 'all',
  })
  const multiBars = modelB.bookingBars.filter((bar) => bar.bookingId === 'b-multi')
  assert(multiBars.length === 2, 'B: two room bars')
  assert(
    multiBars.every((bar) => bar.status === 'CONFIRMED' && bar.label.startsWith('Коваль')),
    'B: shared metadata',
  )
  results.push('B PASS: multi-room booking → two bars, same id/status')

  // D — missing metadata keeps occupancy UNKNOWN, not AVAILABLE
  const missingBar = modelB.bookingBars.find((bar) => bar.bookingId === 'b-missing')
  assert(Boolean(missingBar), 'D: occupied bar exists')
  assert(missingBar?.status === 'UNKNOWN', 'D: status UNKNOWN')
  assert(missingBar?.metadataMissing === true, 'D: metadataMissing')
  assert(missingBar?.label === 'Бронювання', 'D: fallback label')
  results.push('D PASS: missing metadata preserves occupancy with UNKNOWN')

  // E — PENDING vs CONFIRMED from metadata only
  const modelE = buildChessboardModel({
    calendar: {
      ...calendar,
      roomTypes: [
        {
          roomTypeId: 'rt1',
          name: 'Standard',
          rooms: [
            {
              roomId: 'room-a',
              number: '101',
              status: 'AVAILABLE',
              active: true,
              nights: [night('2026-10-10', 'BOOKED', 'b-pending'), night('2026-10-11', 'BOOKED', 'b-conf')],
            },
          ],
        },
      ],
    },
    roomTypeMeta: [{ id: 'rt1', kind: 'ROOM', name: 'Standard' }],
    bookings: [
      bookingMeta('b-pending', ['room-a'], 'PENDING'),
      bookingMeta('b-conf', ['room-a'], 'CONFIRMED'),
    ],
    kindFilter: 'all',
  })
  assert(
    modelE.bookingBars.find((bar) => bar.bookingId === 'b-pending')?.status === 'PENDING',
    'E: PENDING',
  )
  assert(
    modelE.bookingBars.find((bar) => bar.bookingId === 'b-conf')?.status === 'CONFIRMED',
    'E: CONFIRMED',
  )
  results.push('E PASS: PENDING vs CONFIRMED from metadata')

  // F — clipped to visible nights (window starts mid-stay)
  const modelF = buildChessboardModel({
    calendar: {
      from: '2026-10-11',
      to: '2026-10-14',
      roomTypes: [
        {
          roomTypeId: 'rt1',
          name: 'Standard',
          rooms: [
            {
              roomId: 'room-a',
              number: '101',
              status: 'AVAILABLE',
              active: true,
              nights: [
                night('2026-10-11', 'BOOKED', 'b-clip'),
                night('2026-10-12', 'BOOKED', 'b-clip'),
                night('2026-10-13', 'BOOKED', 'b-clip'),
              ],
            },
          ],
        },
      ],
    },
    roomTypeMeta: [{ id: 'rt1', kind: 'ROOM', name: 'Standard' }],
    bookings: [
      {
        ...bookingMeta('b-clip', ['room-a'], 'CONFIRMED'),
        checkIn: '2026-10-09',
        checkOut: '2026-10-15',
      },
    ],
    kindFilter: 'all',
  })
  const clip = modelF.bookingBars.find((bar) => bar.bookingId === 'b-clip')
  assert(clip?.startDate === '2026-10-11' && clip.endDate === '2026-10-14', 'F: clipped bar')
  results.push('F PASS: bar clipped to visible nights without inventing dates')

  // Kind filter + unknown kind kept when filtering
  const modelKind = buildChessboardModel({
    calendar,
    roomTypeMeta: [{ id: 'rt-cottage', kind: 'COTTAGE', name: 'House' }],
    bookings: [],
    kindFilter: 'ROOM',
  })
  assert(
    modelKind.groups.some((group) => group.roomTypeId === 'rt1' && group.kind === 'UNKNOWN'),
    'kind: unresolved ROOM filter keeps unknown types',
  )
  assert(
    !modelKind.groups.some((group) => group.roomTypeId === 'rt-cottage'),
    'kind: known COTTAGE excluded when filter=ROOM',
  )
  results.push('Filter PASS: unknown kind not silently dropped; known mismatch excluded')

  // Status semantics present in admin bars
  const states = new Set(modelB.adminBars.map((bar) => bar.kind))
  assert(states.has('MAINTENANCE'), 'status: MAINTENANCE')
  assert(states.has('OUT_OF_ORDER'), 'status: OUT_OF_ORDER')
  assert(states.has('INACTIVE'), 'status: INACTIVE')
  assert(states.has('BLOCKED'), 'status: BLOCKED')
  assert(
    modelB.adminBars.some((bar) => bar.kind === 'BLOCKED' && bar.label === 'Заблоковано' && bar.blockId),
    'status: blocked bars keep blockId and Заблоковано label',
  )
  results.push('Status PASS: BLOCKED/MAINTENANCE/OUT_OF_ORDER/INACTIVE from calendar states')

  // Archived inventory (room.active=false): API night state is INACTIVE; bookingId still attached.
  // Occupancy bars require BOOKED/CHECKED_IN — history stays on bookings list, not silently dropped.
  const archivedCalendar: AdminCalendarView = {
    from: '2026-10-10',
    to: '2026-10-13',
    roomTypes: [
      {
        roomTypeId: 'rt-archived',
        name: 'Fiction',
        rooms: [
          {
            roomId: 'room-archived',
            number: 'X1',
            status: 'AVAILABLE',
            active: false,
            nights: [
              night('2026-10-10', 'INACTIVE', 'b-hist'),
              night('2026-10-11', 'INACTIVE', 'b-hist'),
              night('2026-10-12', 'INACTIVE'),
            ],
          },
        ],
      },
    ],
  }
  const modelHist = buildChessboardModel({
    calendar: archivedCalendar,
    roomTypeMeta: [{ id: 'rt-archived', kind: 'ROOM', name: 'Fiction' }],
    bookings: [bookingMeta('b-hist', ['room-archived'], 'CONFIRMED')],
    kindFilter: 'all',
  })
  assert(modelHist.groups.length === 1, 'hist: archived type kept in archive mode')
  assert(
    modelHist.groups[0]?.rooms.some((room) => room.roomId === 'room-archived' && room.active === false),
    'hist: inactive room row present',
  )
  assert(
    modelHist.adminBars.some((bar) => bar.roomId === 'room-archived' && bar.kind === 'INACTIVE'),
    'hist: INACTIVE admin bar (nightDecision precedence unchanged)',
  )
  assert(
    !modelHist.bookingBars.some((bar) => bar.bookingId === 'b-hist'),
    'hist: no fake BOOKED bar when state is INACTIVE',
  )
  assert(
    archivedCalendar.roomTypes[0]?.rooms[0]?.nights.some((n) => n.bookingId === 'b-hist'),
    'hist: bookingId retained on night payload for cross-ref',
  )
  results.push('History PASS: archived units visible in archive mode; bookingId kept; list history separate')

  const labeled = buildChessboardModel({
    calendar: {
      from: '2026-10-10',
      to: '2026-10-11',
      roomTypes: [
        {
          roomTypeId: 'rt-slug',
          name: 'dakh-room-14-3',
          rooms: [
            {
              roomId: 'room-slug',
              number: 'dakh-room-14-3',
              status: 'AVAILABLE',
              active: true,
              nights: [night('2026-10-10', 'AVAILABLE')],
            },
          ],
        },
        {
          roomTypeId: 'rt-phys',
          name: 'Номер з терасою',
          rooms: [
            {
              roomId: 'room-phys',
              number: '14/1',
              status: 'AVAILABLE',
              active: true,
              nights: [night('2026-10-10', 'BOOKED', 'b-keep')],
            },
          ],
        },
      ],
    },
    roomTypeMeta: [
      { id: 'rt-slug', kind: 'ROOM', name: 'Номер 14/3' },
      { id: 'rt-phys', kind: 'ROOM', name: 'Номер з терасою' },
    ],
    bookings: [],
    kindFilter: 'all',
  })
  const slugRoom = labeled.groups.find((group) => group.roomTypeId === 'rt-slug')?.rooms[0]
  const physicalRoom = labeled.groups.find((group) => group.roomTypeId === 'rt-phys')?.rooms[0]
  assert(slugRoom?.roomId === 'room-slug' && slugRoom.number === 'dakh-room-14-3', 'label: room id and raw number stay')
  assert(slugRoom?.displayTitle === 'Номер 14/3' && slugRoom.displayCode === null, 'label: slug is not the row title')
  assert(
    physicalRoom?.number === '14/1' &&
      physicalRoom.displayTitle === 'Номер з терасою' &&
      physicalRoom.displayCode === '14/1',
    'label: 14/1 stays beside the type name',
  )
  assert(
    labeled.bookingBars.some((bar) => bar.bookingId === 'b-keep' && bar.roomId === 'room-phys'),
    'label: booking stays on roomId',
  )
  assert(
    !labeled.bookingBars.some((bar) => bar.roomId === '14/1' || bar.roomId === 'Номер з терасою'),
    'label: booking is not attached to the display text',
  )
  results.push('Label PASS: display text is separate from roomId and bookingId')

  return results
}

export function printCalendarAdapterChecks() {
  for (const line of runCalendarAdapterChecks()) console.log(line)
  console.log('All calendar adapter checks passed.')
}

const entryArg = (globalThis as { process?: { argv?: string[] } }).process?.argv?.[1]
if (entryArg?.includes('calendar-adapter.verify')) {
  printCalendarAdapterChecks()
}
