import { ApiError, delay } from '@/mocks/delay'
import * as db from '@/mocks/db'
import { getActorId } from '@/mocks/session'
import type { PricePeriod, RatePlan } from '@/types'

function clone<T>(value: T): T {
  return structuredClone(value)
}

export async function getRatePlans() {
  await delay()
  return clone(db.ratePlans)
}

export async function getPricePeriods() {
  await delay()
  return clone(db.pricePeriods)
}

export async function saveRatePlan(input: Omit<RatePlan, 'id'> & { id?: string }) {
  await delay()
  if (!input.name.trim()) throw new ApiError('Вкажіть назву тарифу')
  if (input.id) {
    const current = db.ratePlans.find((item) => item.id === input.id)
    if (!current) throw new ApiError('Тариф не знайдено')
    Object.assign(current, { ...input, name: input.name.trim() })
    db.addAudit({
      actorId: getActorId(),
      action: 'Оновлено тариф',
      entity: 'rate',
      entityId: current.id,
      details: current.name,
    })
    return clone(current)
  }
  const created: RatePlan = { ...input, id: db.uid('rp'), name: input.name.trim() }
  db.ratePlans.push(created)
  db.addAudit({
    actorId: getActorId(),
    action: 'Створено тариф',
    entity: 'rate',
    entityId: created.id,
    details: created.name,
  })
  return clone(created)
}

export async function savePricePeriod(input: Omit<PricePeriod, 'id'> & { id?: string }) {
  await delay()
  if (!input.startDate || !input.endDate || input.endDate <= input.startDate) {
    throw new ApiError('Вкажіть коректний період')
  }
  if (input.pricePerNight <= 0) throw new ApiError('Ціна має бути більшою за нуль')
  if (input.id) {
    const current = db.pricePeriods.find((item) => item.id === input.id)
    if (!current) throw new ApiError('Період не знайдено')
    Object.assign(current, input)
    db.addAudit({
      actorId: getActorId(),
      action: 'Оновлено ціну',
      entity: 'price',
      entityId: current.id,
      details: `${input.pricePerNight} ₴`,
    })
    return clone(current)
  }
  const created: PricePeriod = { ...input, id: db.uid('price') }
  db.pricePeriods.push(created)
  db.addAudit({
    actorId: getActorId(),
    action: 'Додано ціну періоду',
    entity: 'price',
    entityId: created.id,
    details: `${input.pricePerNight} ₴`,
  })
  return clone(created)
}

export async function deletePricePeriod(id: string) {
  await delay()
  const index = db.pricePeriods.findIndex((item) => item.id === id)
  if (index < 0) throw new ApiError('Період не знайдено')
  db.pricePeriods.splice(index, 1)
  db.addAudit({
    actorId: getActorId(),
    action: 'Видалено ціну періоду',
    entity: 'price',
    entityId: id,
    details: id,
  })
}
