import { stayNightsAvailable, type NightAvailability } from '@/lib/stay-calendar'
import type { AdminBookingStatusAction } from '@/types'

const MONEY = /^(-?)(\d+)\.(\d{2})$/

export function moneyToCents(value: string): number | null {
  const match = MONEY.exec(value.trim())
  if (!match) return null
  const sign = match[1] === '-' ? -1 : 1
  return sign * (Number(match[2]) * 100 + Number(match[3]))
}

export function centsToMoney(cents: number) {
  const sign = cents < 0 ? '-' : ''
  const absolute = Math.abs(cents)
  const whole = Math.floor(absolute / 100)
  const fraction = `${absolute % 100}`.padStart(2, '0')
  return `${sign}${whole}.${fraction}`
}

/** Difference next − previous. Null when either amount is not a 2-decimal money string. */
export function stayPriceDifference(previous: string, next: string) {
  const before = moneyToCents(previous)
  const after = moneyToCents(next)
  if (before === null || after === null) return null
  const delta = after - before
  return {
    same: delta === 0,
    increased: delta > 0,
    delta: centsToMoney(delta),
  }
}

export function statusOccupancyImpact(action: AdminBookingStatusAction) {
  if (action === 'confirm') return 'Статус стане «Підтверджено». Ці дати залишаться зайнятими.'
  if (action === 'check-in') {
    return 'Статус стане «Заселено». Дати залишаться зайнятими, а змінити їх після заселення вже не можна.'
  }
  if (action === 'check-out') return 'Проживання завершиться. Зайняті дати звільняться для інших бронювань.'
  if (action === 'no-show') {
    return 'Бронювання закриється як «Не заїхав» і не буде видалене. Зайняті дати звільняться.'
  }
  return 'Бронювання буде скасоване, а не видалене. Зайняті дати звільняться, якщо правила готелю це дозволяють.'
}

/**
 * Rooms whose every night in [checkIn, checkOut) is free and whose capacity fits.
 * The current room stays selectable so an invalid proposal can still be explained.
 */
export function roomsOfferedForStay(input: {
  roomIds: readonly string[]
  nightsByRoom: ReadonlyMap<string, ReadonlyMap<string, NightAvailability>>
  checkIn: string
  checkOut: string
  guestCount: number
  capacityByRoom: ReadonlyMap<string, number>
  selectedRoomId?: string
}) {
  const offered = input.roomIds.filter((roomId) => {
    const capacity = input.capacityByRoom.get(roomId)
    if (capacity !== undefined && input.guestCount > capacity) return false
    const nights = input.nightsByRoom.get(roomId)
    if (!nights) return false
    return stayNightsAvailable(input.checkIn, input.checkOut, nights)
  })
  if (input.selectedRoomId && input.roomIds.includes(input.selectedRoomId) && !offered.includes(input.selectedRoomId)) {
    return [input.selectedRoomId, ...offered]
  }
  return offered
}
