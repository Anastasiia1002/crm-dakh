import { roomTypeKindLabel } from '@/lib/labels'
import type { RoomTypeKind } from '@/types'

/** Neutral title when a unit has no usable name, type, or physical number. */
export const ACCOMMODATION_FALLBACK_LABEL = 'Розміщення'

/**
 * Generated catalog slug such as dakh-room-14-3.
 * Three or more lowercase segments are required, so 14-3, 14/1, and DAKH-7 stay visible.
 */
export function isTechnicalUnitCode(value: string) {
  const code = value.trim()
  if (!/^[a-z0-9]+(?:-[a-z0-9]+){2,}$/.test(code)) return false
  return /[a-z]/.test(code)
}

function meaningfulLabel(value: string | null | undefined) {
  const text = value?.trim() ?? ''
  if (!text || isTechnicalUnitCode(text)) return null
  return text
}

/** Prefer the unit name, then the room-type name, then a physical number. */
export function unitDisplayTitle(
  unit: { name: string | null; number: string },
  typeName?: string | null,
) {
  return (
    meaningfulLabel(unit.name) ??
    meaningfulLabel(typeName) ??
    meaningfulLabel(unit.number) ??
    ACCOMMODATION_FALLBACK_LABEL
  )
}

/** Physical number, hidden when it repeats the title or is only a generated slug. */
export function unitDisplayCode(unit: { number: string }, title: string) {
  const number = meaningfulLabel(unit.number)
  if (!number || number === title) return null
  return number
}

/** One line for pickers and banners. The secondary code is omitted when it adds nothing. */
export function unitDisplayLabel(
  unit: { name: string | null; number: string },
  typeName?: string | null,
) {
  const title = unitDisplayTitle(unit, typeName)
  const code = unitDisplayCode(unit, title)
  return code ? `${title} · ${code}` : title
}

/** Room-type heading. A generated slug is not shown in place of the type name. */
export function roomTypeDisplayName(typeName: string | null | undefined) {
  return meaningfulLabel(typeName) ?? ACCOMMODATION_FALLBACK_LABEL
}

/** Accommodations table: the stored type name, or the kind word when that name is unusable. */
export function roomTypeColumnLabel(typeName: string | null | undefined, kind: RoomTypeKind) {
  return meaningfulLabel(typeName) ?? roomTypeKindLabel[kind]
}

/**
 * Presentation for one chessboard row.
 * roomId and number stay the raw API values; title and code are display-only.
 */
export function chessboardRoomLabel(input: {
  roomId: string
  number: string
  name?: string | null
  typeName?: string | null
}) {
  const unit = { name: input.name ?? null, number: input.number }
  const title = unitDisplayTitle(unit, input.typeName)
  return {
    roomId: input.roomId,
    number: input.number,
    title,
    code: unitDisplayCode(unit, title),
  }
}

/** Booking filter or selector label. An inactive room stays identifiable without a generated slug. */
export function bookingRoomFilterLabel(
  room: { name: string | null; number: string; active?: boolean },
  typeName?: string | null,
) {
  const label = unitDisplayLabel(room, typeName)
  if (room.active === false) return `${label} · вимкнений`
  return label
}

/** Append a booking's room when the loaded catalog does not already contain its id. */
export function withReferencedRoom<T extends { id: string }>(rooms: readonly T[], referenced: T | null | undefined): T[] {
  if (!referenced || rooms.some((room) => room.id === referenced.id)) return [...rooms]
  return [...rooms, referenced]
}

/**
 * Keep a booking's room in the selector when it is absent from the loaded list.
 * The returned id is the booking's roomId. The label is display-only.
 */
export function referencedRoomOption(input: {
  rooms: readonly { id: string; name: string | null; number: string; roomTypeId: string; active?: boolean }[]
  roomId: string
  number: string
  roomTypeId: string
  typeName?: string | null
}) {
  const existing = input.rooms.find((room) => room.id === input.roomId)
  if (existing) {
    return { roomId: existing.id, label: bookingRoomFilterLabel(existing, input.typeName) }
  }
  return {
    roomId: input.roomId,
    label: bookingRoomFilterLabel(
      { name: null, number: input.number, active: false },
      input.typeName,
    ),
  }
}

/** Shared RoomType copy. A count is included only when the caller already knows it. */
export function sharedRoomTypeNotice(unitCount: number | null) {
  const base =
    'Назва для гостей, опис, місткість і фото належать типу розміщення. Зміна застосовується до всіх розміщень цього типу.'
  if (unitCount === null) return base
  return `${base} Кількість розміщень цього типу: ${unitCount}.`
}
