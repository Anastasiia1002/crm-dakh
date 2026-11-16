import { isInternalOnlyRatePlanCode } from '@/lib/admin-rate-plans'
import type { RatePlan } from '@/types'

export type DefaultRatePlanChoice =
  | { mode: 'auto'; plan: RatePlan }
  | { mode: 'choose'; plans: RatePlan[]; reason: 'none' | 'several' | 'test-only' }

export function commercialRatePlans(plans: readonly RatePlan[]) {
  return plans.filter((plan) => plan.active && !isInternalOnlyRatePlanCode(plan.code))
}

export function pickDefaultCommercialRatePlan(plans: readonly RatePlan[]): DefaultRatePlanChoice {
  const commercial = commercialRatePlans(plans)
  if (commercial.length === 0) {
    return { mode: 'choose', plans: [], reason: plans.some((plan) => plan.active) ? 'test-only' : 'none' }
  }
  const standards = commercial.filter((plan) => plan.type === 'STANDARD')
  if (standards.length === 1) return { mode: 'auto', plan: standards[0] }
  if (standards.length > 1) return { mode: 'choose', plans: standards, reason: 'several' }
  if (commercial.length === 1) return { mode: 'auto', plan: commercial[0] }
  return { mode: 'choose', plans: commercial, reason: 'several' }
}
