import { ApiError, delay } from '@/mocks/delay'
import * as db from '@/mocks/db'
import { getActorId } from '@/mocks/session'
import type { BookingSettings, CancellationPolicy } from '@/types'

function clone<T>(value: T): T {
  return structuredClone(value)
}

export async function getSettings() {
  await delay()
  return clone(db.settings)
}

export async function updateSettings(input: BookingSettings) {
  await delay()
  if (!input.checkInTime || !input.checkOutTime) throw new ApiError('Вкажіть час заїзду і виїзду')
  if (input.minNights < 1 || input.maxNights < input.minNights) {
    throw new ApiError('Перевірте обмеження кількості ночей')
  }
  Object.assign(db.settings, input)
  db.addAudit({
    actorId: getActorId(),
    action: 'Оновлено налаштування',
    entity: 'settings',
    entityId: 'booking',
    details: `Заїзд ${input.checkInTime}, виїзд ${input.checkOutTime}`,
  })
  return clone(db.settings)
}

export async function getPolicies() {
  await delay()
  return clone(db.policies)
}

export async function savePolicy(input: Omit<CancellationPolicy, 'id'> & { id?: string }) {
  await delay()
  if (!input.name.trim()) throw new ApiError('Вкажіть назву правила')
  if (input.rules.length === 0) throw new ApiError('Додайте хоча б одну умову')
  const rules = [...input.rules].sort((a, b) => b.daysBefore - a.daysBefore)
  if (input.id) {
    const current = db.policies.find((item) => item.id === input.id)
    if (!current) throw new ApiError('Правило не знайдено')
    Object.assign(current, { ...input, name: input.name.trim(), rules })
    db.addAudit({
      actorId: getActorId(),
      action: 'Оновлено правило скасування',
      entity: 'policy',
      entityId: current.id,
      details: current.name,
    })
    return clone(current)
  }
  const created: CancellationPolicy = { ...input, id: db.uid('pol'), name: input.name.trim(), rules }
  db.policies.push(created)
  db.addAudit({
    actorId: getActorId(),
    action: 'Створено правило скасування',
    entity: 'policy',
    entityId: created.id,
    details: created.name,
  })
  return clone(created)
}

export async function deletePolicy(id: string) {
  await delay()
  if (db.ratePlans.some((item) => item.cancellationPolicyId === id)) {
    throw new ApiError('Правило використовується тарифом')
  }
  const index = db.policies.findIndex((item) => item.id === id)
  if (index < 0) throw new ApiError('Правило не знайдено')
  const [removed] = db.policies.splice(index, 1)
  db.addAudit({
    actorId: getActorId(),
    action: 'Видалено правило скасування',
    entity: 'policy',
    entityId: id,
    details: removed.name,
  })
}
