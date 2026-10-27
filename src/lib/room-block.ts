import { ApiError } from '@/lib/api-error'
import { unitDisplayTitle } from '@/lib/accommodation-labels'
import { addCalendarDays, nightsBetween } from '@/lib/dates'
import { errorMessage } from '@/lib/errors'
import { nightsLabel } from '@/lib/format'
import { roomBlockTypeLabel } from '@/lib/labels'
import type { RoomBlockType } from '@/types'

export const BLOCK_NOTE_MAX = 500

export const BLOCK_REASON_OPTIONS = [
  { id: 'repair', type: 'MAINTENANCE', label: 'Ремонт', defaultNote: 'Ремонт' },
  {
    id: 'maintenance',
    type: 'MAINTENANCE',
    label: 'Технічне обслуговування',
    defaultNote: 'Технічне обслуговування',
  },
  { id: 'owner_use', type: 'OWNER_USE', label: 'Для власника', defaultNote: null },
  { id: 'other', type: 'OTHER', label: 'Інша причина', defaultNote: null },
] as const

export type BlockReasonId = (typeof BLOCK_REASON_OPTIONS)[number]['id']

const MONTHS_GENITIVE = [
  'січня',
  'лютого',
  'березня',
  'квітня',
  'травня',
  'червня',
  'липня',
  'серпня',
  'вересня',
  'жовтня',
  'листопада',
  'грудня',
] as const

export function isBlockReasonId(value: string): value is BlockReasonId {
  return BLOCK_REASON_OPTIONS.some((option) => option.id === value)
}

export function blockWriteFromReason(reasonId: BlockReasonId, note: string): {
  type: RoomBlockType
  reason: string | null
} {
  const option = BLOCK_REASON_OPTIONS.find((item) => item.id === reasonId)
  if (!option) {
    return { type: 'OTHER', reason: note.trim() || null }
  }
  const trimmed = note.trim()
  return {
    type: option.type,
    reason: trimmed || option.defaultNote,
  }
}

export function blockReasonLabel(block: { type: RoomBlockType; reason: string | null }) {
  const reason = block.reason?.trim()
  if (reason) {
    const mapped = BLOCK_REASON_OPTIONS.find((option) => option.defaultNote === reason)
    if (mapped) return mapped.label
    return `${roomBlockTypeLabel[block.type]} · ${reason}`
  }
  return roomBlockTypeLabel[block.type]
}

export function blockedNights(startDate: string, endDate: string): string[] {
  if (!(endDate > startDate)) return []
  const nights: string[] = []
  let cursor = startDate
  while (cursor < endDate) {
    nights.push(cursor)
    cursor = addCalendarDays(cursor, 1)
    if (nights.length > 10_000) break
  }
  return nights
}

function parseIsoDate(iso: string) {
  const [year, month, day] = iso.split('-').map(Number)
  return { year, month, day }
}

function monthGenitive(month: number) {
  return MONTHS_GENITIVE[month - 1] ?? ''
}

/** Last occupied night of a half-open [start, end) block. */
export function lastBlockedNight(startDate: string, endDate: string) {
  if (!(endDate > startDate)) return startDate
  return addCalendarDays(endDate, -1)
}

export function formatNightSpanUk(startDate: string, endDate: string) {
  const last = lastBlockedNight(startDate, endDate)
  const start = parseIsoDate(startDate)
  const end = parseIsoDate(last)
  const startMonth = monthGenitive(start.month)
  const endMonth = monthGenitive(end.month)
  if (start.year === end.year && start.month === end.month) {
    if (startDate === last) return `${start.day} ${startMonth} ${start.year} року`
    return `${start.day}–${end.day} ${startMonth} ${start.year} року`
  }
  if (start.year === end.year) {
    return `${start.day} ${startMonth} – ${end.day} ${endMonth} ${end.year} року`
  }
  return `${start.day} ${startMonth} ${start.year} – ${end.day} ${endMonth} ${end.year} року`
}

export function formatExclusiveSpanUk(startDate: string, endDate: string) {
  const start = parseIsoDate(startDate)
  const end = parseIsoDate(endDate)
  const startMonth = monthGenitive(start.month)
  const endMonth = monthGenitive(end.month)
  if (start.year === end.year && start.month === end.month) {
    return `${start.day} до ${end.day} ${startMonth} ${start.year} року`
  }
  if (start.year === end.year) {
    return `${start.day} ${startMonth} до ${end.day} ${endMonth} ${end.year} року`
  }
  return `${start.day} ${startMonth} ${start.year} до ${end.day} ${endMonth} ${end.year} року`
}

export function blockConfirmMessage(
  room: { name: string | null; number: string; typeName?: string | null },
  startDate: string,
  endDate: string,
) {
  const nights = nightsBetween(startDate, endDate)
  const name = unitDisplayTitle(room, room.typeName)
  return `Заблокувати ${name} на ${nightsLabel(nights)}: ${formatNightSpanUk(startDate, endDate)}? У цей період нові бронювання будуть недоступні.`
}

export function unblockConfirmMessage(
  room: { name: string | null; number: string; typeName?: string | null },
  startDate: string,
  endDate: string,
) {
  const name = unitDisplayTitle(room, room.typeName)
  return `Зняти блокування для «${name}» з ${formatExclusiveSpanUk(startDate, endDate)}?`
}

export function blockConflictMessage(error: unknown) {
  if (!(error instanceof ApiError)) return errorMessage(error)
  if (error.status === 403) return 'Недостатньо прав для цієї дії'
  if (error.code === 'ACTIVE_BOOKING_OVERLAP') {
    const nights = error.details?.filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item)) ?? []
    if (nights.length > 0) {
      return `Неможливо заблокувати вибрані дати: на цей період вже існує бронювання. Зайняті ночі: ${nights.join(', ')}.`
    }
    return 'Неможливо заблокувати вибрані дати: на цей період вже існує бронювання.'
  }
  if (error.code === 'ROOM_BLOCK_OVERLAP') {
    const nights = error.details?.filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item)) ?? []
    if (nights.length > 0) {
      return `Неможливо заблокувати вибрані дати: на цей період уже є блокування. Зайняті ночі: ${nights.join(', ')}.`
    }
    return 'Неможливо заблокувати вибрані дати: на цей період уже є блокування.'
  }
  if (error.status === 404) return error.message || 'Розміщення не знайдено'
  if (error.details?.length) return error.details.join('. ')
  return error.message || errorMessage(error)
}
