import { ApiError, delay } from '@/mocks/delay'
import * as db from '@/mocks/db'
import { getActorId } from '@/mocks/session'
import type { PromoCode } from '@/types'

function clone<T>(value: T): T {
  return structuredClone(value)
}

export async function getPromoCodes() {
  await delay()
  return clone(db.promoCodes)
}

export async function savePromoCode(input: Omit<PromoCode, 'id' | 'usedCount'> & { id?: string }) {
  await delay()
  const code = input.code.trim().toUpperCase()
  if (!code) throw new ApiError('Вкажіть код')
  if (input.discountValue <= 0) throw new ApiError('Знижка має бути більшою за нуль')
  if (input.discountType === 'percent' && input.discountValue > 100) {
    throw new ApiError('Відсоток не може перевищувати 100')
  }
  if (!input.validFrom || !input.validTo || input.validTo < input.validFrom) {
    throw new ApiError('Вкажіть коректний період дії')
  }
  const duplicate = db.promoCodes.find((item) => item.code.toUpperCase() === code && item.id !== input.id)
  if (duplicate) throw new ApiError('Такий промокод уже існує')
  if (input.id) {
    const current = db.promoCodes.find((item) => item.id === input.id)
    if (!current) throw new ApiError('Промокод не знайдено')
    Object.assign(current, { ...input, code, description: input.description.trim() })
    db.addAudit({
      actorId: getActorId(),
      action: 'Оновлено промокод',
      entity: 'promo',
      entityId: current.id,
      details: current.code,
    })
    return clone(current)
  }
  const created: PromoCode = {
    ...input,
    id: db.uid('prm'),
    code,
    description: input.description.trim(),
    usedCount: 0,
  }
  db.promoCodes.unshift(created)
  db.addAudit({
    actorId: getActorId(),
    action: 'Створено промокод',
    entity: 'promo',
    entityId: created.id,
    details: created.code,
  })
  return clone(created)
}

export async function setPromoActive(id: string, active: boolean) {
  await delay()
  const promo = db.promoCodes.find((item) => item.id === id)
  if (!promo) throw new ApiError('Промокод не знайдено')
  promo.active = active
  db.addAudit({
    actorId: getActorId(),
    action: active ? 'Увімкнено промокод' : 'Вимкнено промокод',
    entity: 'promo',
    entityId: id,
    details: promo.code,
  })
  return clone(promo)
}
