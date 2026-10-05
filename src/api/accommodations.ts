import { ApiError, delay } from '@/mocks/delay'
import * as db from '@/mocks/db'
import { findBookingConflict } from '@/mocks/inventory'
import { getActorId } from '@/mocks/session'
import { addDaysIso } from '@/lib/dates'
import type { Accommodation, AccommodationKind, RoomType } from '@/types'

function clone<T>(value: T): T {
  return structuredClone(value)
}

export async function getRoomTypes() {
  await delay()
  return clone(db.roomTypes)
}

export async function getAccommodations() {
  await delay()
  return clone(db.accommodations)
}

export async function getBlocks() {
  await delay()
  return clone(db.blocks)
}

export async function saveRoomType(input: Omit<RoomType, 'id'> & { id?: string }) {
  await delay()
  if (!input.name.trim()) throw new ApiError('Вкажіть назву категорії')
  if (input.capacity < 1) throw new ApiError('Місткість має бути більшою за нуль')
  if (input.id) {
    const current = db.roomTypes.find((item) => item.id === input.id)
    if (!current) throw new ApiError('Категорію не знайдено')
    Object.assign(current, { ...input, name: input.name.trim() })
    db.addAudit({
      actorId: getActorId(),
      action: 'Оновлено категорію',
      entity: 'roomType',
      entityId: current.id,
      details: current.name,
    })
    return clone(current)
  }
  const created: RoomType = { ...input, id: db.uid('rt'), name: input.name.trim() }
  db.roomTypes.push(created)
  db.addAudit({
    actorId: getActorId(),
    action: 'Створено категорію',
    entity: 'roomType',
    entityId: created.id,
    details: created.name,
  })
  return clone(created)
}

export async function deleteRoomType(id: string) {
  await delay()
  if (db.accommodations.some((item) => item.roomTypeId === id)) {
    throw new ApiError('Категорія використовується розміщеннями')
  }
  const index = db.roomTypes.findIndex((item) => item.id === id)
  if (index < 0) throw new ApiError('Категорію не знайдено')
  const [removed] = db.roomTypes.splice(index, 1)
  db.addAudit({
    actorId: getActorId(),
    action: 'Видалено категорію',
    entity: 'roomType',
    entityId: id,
    details: removed.name,
  })
}

export async function saveAccommodation(
  input: Omit<Accommodation, 'id' | 'kind'> & { id?: string; kind: AccommodationKind },
) {
  await delay()
  if (!input.name.trim() || !input.code.trim()) throw new ApiError('Вкажіть назву і код')
  const duplicate = db.accommodations.find(
    (item) => item.code.toLowerCase() === input.code.trim().toLowerCase() && item.id !== input.id,
  )
  if (duplicate) throw new ApiError('Такий код уже існує')
  if (input.id) {
    const current = db.accommodations.find((item) => item.id === input.id)
    if (!current) throw new ApiError('Розміщення не знайдено')
    Object.assign(current, {
      name: input.name.trim(),
      code: input.code.trim(),
      roomTypeId: input.roomTypeId,
      floor: input.floor,
      kind: input.kind,
    })
    db.addAudit({
      actorId: getActorId(),
      action: 'Оновлено розміщення',
      entity: 'accommodation',
      entityId: current.id,
      details: current.name,
    })
    return clone(current)
  }
  const created: Accommodation = {
    id: db.uid('acc'),
    name: input.name.trim(),
    code: input.code.trim(),
    kind: input.kind,
    roomTypeId: input.roomTypeId,
    floor: input.floor,
  }
  db.accommodations.push(created)
  db.addAudit({
    actorId: getActorId(),
    action: 'Створено розміщення',
    entity: 'accommodation',
    entityId: created.id,
    details: created.name,
  })
  return clone(created)
}

export async function createBlock(input: { accommodationId: string; from: string; to: string; reason: string }) {
  await delay()
  if (!input.from || !input.to || input.to < input.from) throw new ApiError('Вкажіть коректний період блокування')
  if (!input.reason.trim()) throw new ApiError('Вкажіть причину блокування')
  const endExclusive = addDaysIso(input.to, 1)
  if (findBookingConflict(input.accommodationId, input.from, endExclusive)) {
    throw new ApiError('На ці дати є активне бронювання')
  }
  const accommodation = db.accommodations.find((item) => item.id === input.accommodationId)
  if (!accommodation) throw new ApiError('Розміщення не знайдено')
  const block = {
    id: db.uid('blk'),
    accommodationId: input.accommodationId,
    from: input.from,
    to: input.to,
    reason: input.reason.trim(),
  }
  db.blocks.push(block)
  db.addAudit({
    actorId: getActorId(),
    action: 'Заблоковано',
    entity: 'accommodation',
    entityId: accommodation.id,
    details: `${accommodation.name} · ${input.reason.trim()}`,
  })
  return clone(block)
}

export async function deleteBlock(id: string) {
  await delay()
  const index = db.blocks.findIndex((item) => item.id === id)
  if (index < 0) throw new ApiError('Блокування не знайдено')
  const [removed] = db.blocks.splice(index, 1)
  const accommodation = db.accommodations.find((item) => item.id === removed.accommodationId)
  db.addAudit({
    actorId: getActorId(),
    action: 'Знято блокування',
    entity: 'accommodation',
    entityId: removed.accommodationId,
    details: accommodation?.name ?? removed.accommodationId,
  })
}
