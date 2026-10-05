import { ApiError, delay } from '@/mocks/delay'
import * as db from '@/mocks/db'
import { getActorId } from '@/mocks/session'
import type { AdminUser } from '@/types'

function clone<T>(value: T): T {
  return structuredClone(value)
}

export async function getUsers() {
  await delay()
  return clone(db.users)
}

export async function getAudit() {
  await delay()
  return clone(db.audit)
}

export async function saveUser(input: Omit<AdminUser, 'id'> & { id?: string }) {
  await delay()
  if (!input.firstName.trim() || !input.lastName.trim()) throw new ApiError('Вкажіть імʼя та прізвище')
  const email = input.email.trim().toLowerCase()
  if (!email.includes('@')) throw new ApiError('Вкажіть коректну електронну пошту')
  const duplicate = db.users.find((item) => item.email.toLowerCase() === email && item.id !== input.id)
  if (duplicate) throw new ApiError('Користувач з такою поштою вже існує')
  if (input.id) {
    const current = db.users.find((item) => item.id === input.id)
    if (!current) throw new ApiError('Користувача не знайдено')
    if (current.id === getActorId() && !input.active) throw new ApiError('Не можна вимкнути власний доступ')
    Object.assign(current, {
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      email,
      role: input.role,
      active: input.active,
    })
    db.addAudit({
      actorId: getActorId(),
      action: 'Оновлено користувача',
      entity: 'user',
      entityId: current.id,
      details: `${current.firstName} ${current.lastName}`,
    })
    return clone(current)
  }
  const created: AdminUser = {
    id: db.uid('usr'),
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    email,
    role: input.role,
    active: input.active,
  }
  db.users.push(created)
  db.addAudit({
    actorId: getActorId(),
    action: 'Створено користувача',
    entity: 'user',
    entityId: created.id,
    details: `${created.firstName} ${created.lastName}`,
  })
  return clone(created)
}
