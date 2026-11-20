import { buildChessboardModel } from '@/lib/calendar-adapter'
import { CALENDAR_WINDOW_DAYS } from '@/hooks/useCalendarBoard'
import { addCalendarDays, eachDate } from '@/lib/dates'
import type {
  AdminBookingListItem,
  AdminCalendarNight,
  Block,
  CalendarNightState,
  RoomStatus,
} from '@/types'

function night(
  date: string,
  state: CalendarNightState,
  bookingId: string | null = null,
  blockId: string | null = null,
): AdminCalendarNight {
  return { date, state, bookingId, blockId }
}

function booking(
  id: string,
  status: AdminBookingListItem['status'],
  checkIn: string,
  checkOut: string,
  firstName: string,
  lastName: string,
  roomId: string,
  number: string,
  roomTypeName: string,
): AdminBookingListItem {
  return {
    id,
    status,
    source: 'ADMIN',
    checkIn,
    checkOut,
    adults: 2,
    children: 0,
    guestCount: 2,
    promoCodeId: null,
    createdAt: `${checkIn}T10:00:00.000Z`,
    guest: {
      id: `g-${id}`,
      firstName,
      lastName,
      email: null,
      phone: null,
      country: null,
      city: null,
    },
    rooms: [
      {
        roomId,
        number,
        roomTypeId: roomId.startsWith('c') ? 'rt-cottage' : 'rt-room',
        roomTypeName,
        ratePlanId: 'rp1',
      },
    ],
    totalAmount: '1000.00',
    currency: 'UAH',
  }
}

function rowNights(
  dates: string[],
  paint: (date: string, index: number) => AdminCalendarNight,
) {
  return dates.map((date, index) => paint(date, index))
}

/** DEV-only populated board: long names, every occupancy color, maintenance, and free nights. */
export function buildMobileChessboardFixture(from: string) {
  const dates = eachDate(from, CALENDAR_WINDOW_DAYS)
  const to = addCalendarDays(from, CALENDAR_WINDOW_DAYS)
  const d = (offset: number) => dates[offset] ?? from

  const bookings = [
    booking('b-pending', 'PENDING', d(0), d(3), 'Оксана', 'Мельник', 'room-14-1', '14/1', 'Номер з терасою'),
    booking('b-confirmed', 'CONFIRMED', d(5), d(8), 'Іван', 'Коваль', 'room-14-1', '14/1', 'Номер з терасою'),
    booking(
      'b-inhouse',
      'CHECKED_IN',
      d(1),
      d(6),
      'Марія',
      'Шевченко',
      'cottage-11',
      '№11',
      '4-кімнатний будиночок до 7 гостей з терасою і видом на ліс',
    ),
  ]

  const calendar = {
    from,
    to,
    roomTypes: [
      {
        roomTypeId: 'rt-room',
        name: 'Номер з терасою',
        rooms: [
          {
            roomId: 'room-14-1',
            number: '14/1',
            status: 'AVAILABLE' as RoomStatus,
            active: true,
            nights: rowNights(dates, (date, index) => {
              if (index < 3) return night(date, 'BOOKED', 'b-pending')
              if (index >= 5 && index < 8) return night(date, 'BOOKED', 'b-confirmed')
              return night(date, 'AVAILABLE')
            }),
          },
          {
            roomId: 'room-slug',
            number: 'dakh-room-14-3',
            status: 'AVAILABLE' as RoomStatus,
            active: true,
            nights: rowNights(dates, (date, index) => {
              if (index >= 2 && index < 5) return night(date, 'BOOKED', 'b-missing')
              return night(date, 'AVAILABLE')
            }),
          },
          {
            roomId: 'room-ooo',
            number: '8',
            status: 'OUT_OF_ORDER' as RoomStatus,
            active: true,
            nights: rowNights(dates, (date) => night(date, 'OUT_OF_ORDER')),
          },
        ],
      },
      {
        roomTypeId: 'rt-cottage',
        name: '4-кімнатний будиночок до 7 гостей з терасою і видом на ліс',
        rooms: [
          {
            roomId: 'cottage-11',
            number: '№11',
            status: 'AVAILABLE' as RoomStatus,
            active: true,
            nights: rowNights(dates, (date, index) => {
              if (index >= 1 && index < 6) return night(date, 'CHECKED_IN', 'b-inhouse')
              if (index >= 8 && index < 11) return night(date, 'MAINTENANCE', null, 'blk-maint')
              return night(date, 'AVAILABLE')
            }),
          },
          {
            roomId: 'cottage-9',
            number: '9',
            status: 'AVAILABLE' as RoomStatus,
            active: true,
            nights: rowNights(dates, (date, index) => {
              if (index >= 4 && index < 7) return night(date, 'BLOCKED', null, 'blk-owner')
              return night(date, 'AVAILABLE')
            }),
          },
        ],
      },
    ],
  }

  const built = buildChessboardModel({
    calendar,
    roomTypeMeta: [
      { id: 'rt-room', kind: 'ROOM', name: 'Номер з терасою' },
      {
        id: 'rt-cottage',
        kind: 'COTTAGE',
        name: '4-кімнатний будиночок до 7 гостей з терасою і видом на ліс',
      },
    ],
    bookings,
    kindFilter: 'all',
  })

  const longCottage =
    '4-кімнатний будиночок до 7 гостей з терасою і видом на ліс'
  const screenshotCottage = '4-кімнатний будиночок до 7 гостей №11'
  const screenshotRoom = '1-кімнатний номер для 2-х з балконом на гори №14/2'
  const titles: Record<string, { displayTitle: string; displayCode: string | null }> = {
    'room-14-1': { displayTitle: 'Кімната Буковина', displayCode: '14/1' },
    'room-slug': { displayTitle: screenshotRoom, displayCode: null },
    'cottage-11': { displayTitle: screenshotCottage, displayCode: '№11' },
    'cottage-9': { displayTitle: longCottage, displayCode: '9' },
  }
  const model = {
    ...built,
    groups: built.groups.map((group) => ({
      ...group,
      rooms: group.rooms.map((room) => ({ ...room, ...(titles[room.roomId] ?? {}) })),
    })),
  }

  const blocks: Block[] = [
    {
      id: 'blk-maint',
      roomId: 'cottage-11',
      startDate: d(8),
      endDate: d(11),
      type: 'MAINTENANCE',
      reason: 'Заміна підлоги',
      createdAt: `${from}T08:00:00.000Z`,
      updatedAt: `${from}T08:00:00.000Z`,
    },
    {
      id: 'blk-owner',
      roomId: 'cottage-9',
      startDate: d(4),
      endDate: d(7),
      type: 'OWNER_USE',
      reason: null,
      createdAt: `${from}T08:00:00.000Z`,
      updatedAt: `${from}T08:00:00.000Z`,
    },
  ]

  return { model, bookings, blocks }
}
