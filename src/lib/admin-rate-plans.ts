import { ApiError } from '@/lib/api-error'
import { isRecoverableConnectionError } from '@/lib/session-policy'
import type { RatePlan, RatePlanType, RatesPage } from '@/types'

const RATE_TYPES: readonly RatePlanType[] = ['STANDARD', 'NON_REFUNDABLE', 'SPECIAL']
const INTERNAL_ONLY_RATE_PLAN_CODES = new Set(['catalog-test-100', 'staging-public-e2e'])

const CONTRACT_ERROR = 'Сервер не повернув коректний тариф. Оновлення недоступне, значення не підставляється.'

export function isInternalOnlyRatePlanCode(code: string) {
  return INTERNAL_ONLY_RATE_PLAN_CODES.has(code.trim().toLowerCase())
}

/** Site column. publicOfferable does not by itself make a stay bookable. */
export type RatePlanSiteState = 'internal' | 'public-candidate' | 'admin-only'

export const RATE_PLAN_SITE_LABEL: Record<RatePlanSiteState, string> = {
  internal: 'Внутрішній / тест',
  'public-candidate': 'Можна пропонувати',
  'admin-only': 'Лише в адмінці',
}

export const RATE_PLAN_CURRENCY_LABEL = 'грн'

export const RATE_PLAN_PRICE_NOTE =
  'У тарифі немає окремої ціни. Нічна ціна задається періодами нижче і зберігається лише в гривнях (UAH). Зміна тарифу не переписує нічні ціни вже створених бронювань.'

export const PUBLIC_OFFER_CONFIRM_TITLE = 'Показати тариф на сайті?'

export const PUBLIC_OFFER_CONFIRM_DETAIL =
  'Ознака publicOfferable сама не відкриває бронювання. Гості побачать тариф лише якщо він активний, для дат є ціни в гривнях, публічне бронювання увімкнене на сервері, номер вільний, і код не є внутрішнім тестовим. Уже створені бронювання зберігають записані нічні ціни.'

export const RATE_PLAN_UNCERTAIN_MESSAGE =
  'Сервер не підтвердив збереження тарифу. Запит міг виконатися. Не надсилайте його повторно, доки не перевірите список тарифів.'

export function ratePlanSiteState(plan: { code: string; publicOfferable: boolean }): RatePlanSiteState {
  if (isInternalOnlyRatePlanCode(plan.code)) return 'internal'
  if (plan.publicOfferable) return 'public-candidate'
  return 'admin-only'
}

/** True only when the editor is turning a commercial tariff on for the public site. */
export function enablingPublicOffer(wasPublic: boolean, nextPublic: boolean) {
  return wasPublic === false && nextPublic === true
}

/**
 * The checkbox may become true only after an explicit confirmation.
 * An already-public tariff stays public without asking again.
 */
export function nextPublicOffer(current: boolean, requested: boolean, confirmed: boolean) {
  if (!requested) return false
  if (current) return true
  return confirmed
}

export type RatePlanSaveGate = { busy: boolean; uncertain: boolean }

export function beginRatePlanSave(gate: RatePlanSaveGate): RatePlanSaveGate | null {
  if (gate.busy || gate.uncertain) return null
  return { busy: true, uncertain: false }
}

export function finishRatePlanSave(
  outcome: 'success' | 'error' | 'uncertain',
): RatePlanSaveGate {
  if (outcome === 'uncertain') return { busy: true, uncertain: true }
  return { busy: false, uncertain: false }
}

export function classifyRatePlanSaveError(error: unknown): 'uncertain' | 'forbidden' | 'validation' | 'error' {
  if (isRecoverableConnectionError(error)) return 'uncertain'
  if (error instanceof ApiError && error.status === 403) return 'forbidden'
  if (error instanceof ApiError && (error.status === 400 || error.status === 409 || error.status === 404)) {
    return 'validation'
  }
  return 'error'
}

export function parseAdminRatePlan(body: unknown): RatePlan {
  try {
    const row = objectOf(body)
    const type = text(row.type)
    if (!RATE_TYPES.includes(type as RatePlanType)) {
      throw new Error('type')
    }
    if (typeof row.publicOfferable !== 'boolean') {
      throw new Error('publicOfferable')
    }
    return {
      id: text(row.id),
      name: text(row.name),
      code: text(row.code),
      description: nullableText(row.description),
      type: type as RatePlanType,
      cancellationPolicyId: nullableText(row.cancellationPolicyId),
      active: booleanOf(row.active),
      publicOfferable: row.publicOfferable,
      createdAt: text(row.createdAt),
      updatedAt: text(row.updatedAt),
    }
  } catch {
    throw new ApiError(CONTRACT_ERROR, 502, 'RATE_PLAN_CONTRACT')
  }
}

export function parseAdminRatePlanPage(body: unknown): RatesPage<RatePlan> {
  try {
    const row = objectOf(body)
    const pagination = objectOf(row.pagination)
    return {
      items: arrayOf(row.items).map(parseAdminRatePlan),
      pagination: {
        page: count(pagination.page),
        limit: count(pagination.limit),
        total: count(pagination.total),
        totalPages: count(pagination.totalPages),
      },
    }
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(CONTRACT_ERROR, 502, 'RATE_PLAN_CONTRACT')
  }
}

function objectOf(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('object')
  return value as Record<string, unknown>
}

function arrayOf(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error('array')
  return value
}

function text(value: unknown) {
  if (typeof value !== 'string' || value.trim().length === 0) throw new Error('text')
  return value
}

function nullableText(value: unknown) {
  if (value === null) return null
  if (typeof value !== 'string') throw new Error('text')
  return value
}

function booleanOf(value: unknown) {
  if (typeof value !== 'boolean') throw new Error('boolean')
  return value
}

function count(value: unknown) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) throw new Error('count')
  return value
}
