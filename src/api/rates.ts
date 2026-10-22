import { apiRequest } from '@/lib/api-client'
import { ApiError, delay } from '@/mocks/delay'
import * as db from '@/mocks/db'
import { getActorId } from '@/mocks/session'
import type {
  CancellationPolicy,
  CancellationPolicyCreateInput,
  CancellationPolicyListQuery,
  CancellationPolicyUpdateInput,
  DayPricePreview,
  DayPriceRule,
  DayPriceRuleCreateInput,
  DayPriceRuleListQuery,
  DayPriceRuleUpdateInput,
  LengthStayDiscount,
  LengthStayDiscountCreateInput,
  LengthStayDiscountListQuery,
  LengthStayDiscountUpdateInput,
  LengthStayPreview,
  PricePeriod,
  RatePlan,
  RatePlanCreateInput,
  RatePlanListQuery,
  RatePlanUpdateInput,
  RatesPage,
  RoomPrice,
  RoomPriceCreateInput,
  RoomPriceListQuery,
  RoomPriceUpdateInput,
} from '@/types'

function clone<T>(value: T): T {
  return structuredClone(value)
}

function querySuffix(params: Record<string, string | number | boolean | undefined>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue
    search.set(key, String(value))
  }
  const suffix = search.toString()
  return suffix ? `?${suffix}` : ''
}

/* ─── Mock inventory for bookings until booking rates migrate ─── */

export async function getRatePlans() {
  await delay()
  return clone(db.ratePlans)
}

export async function getPricePeriods() {
  await delay()
  return clone(db.pricePeriods)
}

export async function saveRatePlan(input: Omit<RatePlan, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) {
  await delay()
  if (!input.name.trim()) throw new ApiError('Вкажіть назву тарифу')
  if (input.id) {
    const current = db.ratePlans.find((item) => item.id === input.id)
    if (!current) throw new ApiError('Тариф не знайдено')
    Object.assign(current, {
      ...input,
      name: input.name.trim(),
      code: input.code.trim().toUpperCase(),
      updatedAt: new Date().toISOString(),
    })
    db.addAudit({
      actorId: getActorId(),
      action: 'Оновлено тариф',
      entity: 'rate',
      entityId: current.id,
      details: current.name,
    })
    return clone(current)
  }
  const now = new Date().toISOString()
  const created: RatePlan = {
    ...input,
    id: db.uid('rp'),
    name: input.name.trim(),
    code: input.code.trim().toUpperCase(),
    createdAt: now,
    updatedAt: now,
  }
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

/* ─── Admin Rates API ─── */

export async function listRatePlans(query: RatePlanListQuery = {}, signal?: AbortSignal): Promise<RatesPage<RatePlan>> {
  return apiRequest(
    `/api/admin/rates/plans${querySuffix({
      page: query.page,
      limit: query.limit,
      search: query.search?.trim() || undefined,
      type: query.type,
      active: query.active,
    })}`,
    { signal },
  )
}

export async function getRatePlan(id: string): Promise<RatePlan> {
  return apiRequest(`/api/admin/rates/plans/${id}`)
}

export async function createRatePlan(input: RatePlanCreateInput): Promise<RatePlan> {
  return apiRequest('/api/admin/rates/plans', {
    method: 'POST',
    body: {
      name: input.name.trim(),
      code: input.code.trim().toUpperCase(),
      description: input.description?.trim() ? input.description.trim() : null,
      type: input.type,
      cancellationPolicyId: input.cancellationPolicyId ?? null,
      active: input.active,
    },
  })
}

export async function updateRatePlan(id: string, input: RatePlanUpdateInput): Promise<RatePlan> {
  const body: RatePlanUpdateInput = {}
  if (input.name !== undefined) body.name = input.name.trim()
  if (input.code !== undefined) body.code = input.code.trim().toUpperCase()
  if (input.description !== undefined) {
    body.description = input.description?.trim() ? input.description.trim() : null
  }
  if (input.type !== undefined) body.type = input.type
  if (input.cancellationPolicyId !== undefined) body.cancellationPolicyId = input.cancellationPolicyId
  if (input.active !== undefined) body.active = input.active
  return apiRequest(`/api/admin/rates/plans/${id}`, {
    method: 'PATCH',
    body,
  })
}

export async function listCancellationPolicies(
  query: CancellationPolicyListQuery = {},
): Promise<RatesPage<CancellationPolicy>> {
  return apiRequest(`/api/admin/rates/cancellation-policies${querySuffix({
    page: query.page,
    limit: query.limit,
    search: query.search?.trim() || undefined,
    active: query.active,
  })}`)
}

export async function getCancellationPolicy(id: string): Promise<CancellationPolicy> {
  return apiRequest(`/api/admin/rates/cancellation-policies/${id}`)
}

export async function createCancellationPolicy(input: CancellationPolicyCreateInput): Promise<CancellationPolicy> {
  return apiRequest('/api/admin/rates/cancellation-policies', {
    method: 'POST',
    body: {
      name: input.name.trim(),
      description: input.description?.trim() ? input.description.trim() : null,
      hoursBefore: input.hoursBefore,
      penaltyAmount: input.penaltyAmount?.trim() ? input.penaltyAmount.trim() : null,
      penaltyPercent: input.penaltyPercent?.trim() ? input.penaltyPercent.trim() : null,
      active: input.active,
    },
  })
}

export async function updateCancellationPolicy(
  id: string,
  input: CancellationPolicyUpdateInput,
): Promise<CancellationPolicy> {
  const body: CancellationPolicyUpdateInput = {}
  if (input.name !== undefined) body.name = input.name.trim()
  if (input.description !== undefined) {
    body.description = input.description?.trim() ? input.description.trim() : null
  }
  if (input.hoursBefore !== undefined) body.hoursBefore = input.hoursBefore
  if (input.penaltyAmount !== undefined) {
    body.penaltyAmount = input.penaltyAmount?.trim() ? input.penaltyAmount.trim() : null
  }
  if (input.penaltyPercent !== undefined) {
    body.penaltyPercent = input.penaltyPercent?.trim() ? input.penaltyPercent.trim() : null
  }
  if (input.active !== undefined) body.active = input.active
  return apiRequest(`/api/admin/rates/cancellation-policies/${id}`, {
    method: 'PATCH',
    body,
  })
}

export async function listRoomPrices(query: RoomPriceListQuery = {}): Promise<RatesPage<RoomPrice>> {
  return apiRequest(`/api/admin/rates/prices${querySuffix({
    page: query.page,
    limit: query.limit,
    ratePlanId: query.ratePlanId,
    roomTypeId: query.roomTypeId,
    active: query.active,
    startDate: query.startDate,
    endDate: query.endDate,
  })}`)
}

export async function getRoomPrice(id: string): Promise<RoomPrice> {
  return apiRequest(`/api/admin/rates/prices/${id}`)
}

export async function createRoomPrice(input: RoomPriceCreateInput): Promise<RoomPrice> {
  return apiRequest('/api/admin/rates/prices', {
    method: 'POST',
    body: {
      ratePlanId: input.ratePlanId,
      roomTypeId: input.roomTypeId,
      startDate: input.startDate,
      endDate: input.endDate,
      price: input.price.trim(),
      minStay: input.minStay,
      maxStay: input.maxStay,
      active: input.active,
    },
  })
}

export async function updateRoomPrice(id: string, input: RoomPriceUpdateInput): Promise<RoomPrice> {
  const body: RoomPriceUpdateInput = {}
  if (input.ratePlanId !== undefined) body.ratePlanId = input.ratePlanId
  if (input.roomTypeId !== undefined) body.roomTypeId = input.roomTypeId
  if (input.startDate !== undefined) body.startDate = input.startDate
  if (input.endDate !== undefined) body.endDate = input.endDate
  if (input.price !== undefined) body.price = input.price.trim()
  if (input.minStay !== undefined) body.minStay = input.minStay
  if (input.maxStay !== undefined) body.maxStay = input.maxStay
  if (input.active !== undefined) body.active = input.active
  return apiRequest(`/api/admin/rates/prices/${id}`, {
    method: 'PATCH',
    body,
  })
}

export async function deleteRoomPrice(id: string): Promise<{ ok: true }> {
  return apiRequest(`/api/admin/rates/prices/${id}`, { method: 'DELETE' })
}

export async function listDayPriceRules(query: DayPriceRuleListQuery = {}): Promise<RatesPage<DayPriceRule>> {
  return apiRequest(
    `/api/admin/rates/day-price-rules${querySuffix({
      page: query.page,
      limit: query.limit,
      ratePlanId: query.ratePlanId,
      roomTypeId: query.roomTypeId,
      active: query.active,
    })}`,
  )
}

export async function createDayPriceRule(input: DayPriceRuleCreateInput): Promise<DayPriceRule> {
  return apiRequest('/api/admin/rates/day-price-rules', { method: 'POST', body: input })
}

export async function updateDayPriceRule(id: string, input: DayPriceRuleUpdateInput): Promise<DayPriceRule> {
  return apiRequest(`/api/admin/rates/day-price-rules/${id}`, { method: 'PATCH', body: input })
}

export async function deleteDayPriceRule(id: string): Promise<{ ok: true }> {
  return apiRequest(`/api/admin/rates/day-price-rules/${id}`, { method: 'DELETE' })
}

export async function previewDayPrice(input: {
  ratePlanId: string
  roomTypeId: string
  startDate: string
  endDate: string
  weekdayPrice?: string
  weekendPrice?: string
  weekendDays?: number[]
  excludeRuleId?: string
}): Promise<DayPricePreview> {
  return apiRequest('/api/admin/rates/day-price-rules/preview', { method: 'POST', body: input })
}

export async function listLengthStayDiscounts(
  query: LengthStayDiscountListQuery = {},
): Promise<RatesPage<LengthStayDiscount>> {
  return apiRequest(
    `/api/admin/rates/length-stay-discounts${querySuffix({
      page: query.page,
      limit: query.limit,
      active: query.active,
    })}`,
  )
}

export async function createLengthStayDiscount(input: LengthStayDiscountCreateInput): Promise<LengthStayDiscount> {
  return apiRequest('/api/admin/rates/length-stay-discounts', { method: 'POST', body: input })
}

export async function updateLengthStayDiscount(
  id: string,
  input: LengthStayDiscountUpdateInput,
): Promise<LengthStayDiscount> {
  return apiRequest(`/api/admin/rates/length-stay-discounts/${id}`, { method: 'PATCH', body: input })
}

export async function deleteLengthStayDiscount(id: string): Promise<{ ok: true }> {
  return apiRequest(`/api/admin/rates/length-stay-discounts/${id}`, { method: 'DELETE' })
}

export async function previewLengthStay(input: {
  checkIn: string
  checkOut: string
  roomTypeIds: string[]
  roomSubtotal: string
}): Promise<LengthStayPreview> {
  return apiRequest('/api/admin/rates/length-stay-discounts/preview', { method: 'POST', body: input })
}
