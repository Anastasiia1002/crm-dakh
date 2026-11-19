/**
 * Inclusive nightly catalog dates. Run: npx --yes tsx src/lib/price-nights.verify.ts
 */
import { exclusiveEndFromLastNight, inclusiveNightCount, lastNightFromExclusiveEnd, pricePeriodRange } from './price-nights.ts'
import { pickDefaultCommercialRatePlan, resolvedCommercialRatePlanId } from './default-rate-plan.ts'
import type { RatePlan } from '@/types'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

assert(exclusiveEndFromLastNight('2026-11-16') === '2026-11-17', 'single night exclusive end')
assert(lastNightFromExclusiveEnd('2026-12-01') === '2026-11-30', 'catalog end back to last night')
assert(inclusiveNightCount('2026-11-16', '2026-11-16') === 1, 'one occupied night')
assert(inclusiveNightCount('2026-10-05', '2026-10-09') === 5, 'five occupied nights')
assert(pricePeriodRange('current-month', '2026-11-16').firstNight === '2026-11-16', 'current month starts today')
assert(pricePeriodRange('current-month', '2026-11-16').lastNight === '2026-11-30', 'current month last night inclusive')
assert(pricePeriodRange('next-month', '2026-11-16').firstNight === '2026-12-01', 'next month')
assert(pricePeriodRange('current-year', '2026-11-16').lastNight === '2026-12-31', 'current year last night')

const standard: RatePlan = {
  id: 'a',
  name: 'Standard',
  code: 'STANDARD',
  description: null,
  type: 'STANDARD',
  cancellationPolicyId: null,
  active: true,
  publicOfferable: true,
  createdAt: '',
  updatedAt: '',
}
const testPlan: RatePlan = { ...standard, id: 't', code: 'catalog-test-100', name: 'Test' }
const auto = pickDefaultCommercialRatePlan([standard, testPlan])
assert(auto.mode === 'auto' && auto.plan.id === 'a', 'unique commercial STANDARD is selected')
const testsOnly = pickDefaultCommercialRatePlan([testPlan])
assert(testsOnly.mode === 'choose' && testsOnly.reason === 'test-only', 'test rates are never auto-selected')
const several = pickDefaultCommercialRatePlan([
  standard,
  { ...standard, id: 'b', code: 'STANDARD-PLUS' },
])
assert(several.mode === 'choose' && several.reason === 'several', 'several commercial standards require a choice')
assert(resolvedCommercialRatePlanId([standard, testPlan]) === 'a', 'pricing rules can reuse the unique STANDARD id')
assert(resolvedCommercialRatePlanId([standard, { ...standard, id: 'b', code: 'STANDARD-PLUS' }]) === null, 'ambiguous STANDARD is not guessed')

console.log('PASS: inclusive nights and default rate plan')
