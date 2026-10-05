import { ApiError, delay } from '@/mocks/delay'
import * as db from '@/mocks/db'
import { getActorId } from '@/mocks/session'
import type { Service } from '@/types'

function clone<T>(value: T): T {
  return structuredClone(value)
}

export async function getServices() {
  await delay()
  return clone(db.services)
}

export async function saveService(input: Omit<Service, 'id'> & { id?: string }) {
  await delay()
  if (!input.name.trim()) throw new ApiError('Вкажіть назву послуги')
  if (input.price < 0) throw new ApiError('Ціна не може бути відʼємною')
  if (input.id) {
    const current = db.services.find((item) => item.id === input.id)
    if (!current) throw new ApiError('Послугу не знайдено')
    Object.assign(current, { ...input, name: input.name.trim() })
    db.addAudit({
      actorId: getActorId(),
      action: 'Оновлено послугу',
      entity: 'service',
      entityId: current.id,
      details: current.name,
    })
    return clone(current)
  }
  const created: Service = { ...input, id: db.uid('srv'), name: input.name.trim() }
  db.services.push(created)
  db.addAudit({
    actorId: getActorId(),
    action: 'Створено послугу',
    entity: 'service',
    entityId: created.id,
    details: created.name,
  })
  return clone(created)
}

export async function setServiceActive(id: string, active: boolean) {
  await delay()
  const service = db.services.find((item) => item.id === id)
  if (!service) throw new ApiError('Послугу не знайдено')
  service.active = active
  db.addAudit({
    actorId: getActorId(),
    action: active ? 'Увімкнено послугу' : 'Вимкнено послугу',
    entity: 'service',
    entityId: id,
    details: service.name,
  })
  return clone(service)
}
