/**
 * Admin publicOfferable rate-plan mapping. Run: npx --yes tsx src/lib/admin-rate-plans.verify.ts
 */
import { readFileSync } from 'node:fs'
import { ApiError } from './api-error.js'
import { formatMoneyAmount } from './format.js'
import {
  beginRatePlanSave,
  classifyRatePlanSaveError,
  enablingPublicOffer,
  finishRatePlanSave,
  isInternalOnlyRatePlanCode,
  nextPublicOffer,
  parseAdminRatePlan,
  parseAdminRatePlanPage,
  PUBLIC_OFFER_CONFIRM_DETAIL,
  PUBLIC_OFFER_CONFIRM_TITLE,
  RATE_PLAN_SITE_LABEL,
  RATE_PLAN_UNCERTAIN_MESSAGE,
  ratePlanSiteState,
} from './admin-rate-plans.js'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

const plan = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Стандартний',
  code: 'STANDARD',
  description: null,
  type: 'STANDARD',
  cancellationPolicyId: null,
  active: true,
  publicOfferable: false,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
}

const parsed = parseAdminRatePlan(plan)
assert(parsed.publicOfferable === false, 'initial publicOfferable is false from the API')
assert(parseAdminRatePlan({ ...plan, publicOfferable: true }).publicOfferable === true, 'true is kept')

const page = parseAdminRatePlanPage({
  items: [plan, { ...plan, id: '22222222-2222-4222-8222-222222222222', publicOfferable: true }],
  pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
})
assert(page.items[0]?.publicOfferable === false, 'list row 0 keeps false')
assert(page.items[1]?.publicOfferable === true, 'list row 1 keeps true')

let missing = false
try {
  parseAdminRatePlan({ ...plan, publicOfferable: undefined })
} catch (error) {
  missing = error instanceof ApiError && error.code === 'RATE_PLAN_CONTRACT'
}
assert(missing, 'a missing publicOfferable is a contract error, not a guessed false')

let guessed = false
try {
  parseAdminRatePlan({ ...plan, publicOfferable: 'yes' })
} catch (error) {
  guessed = error instanceof ApiError && error.code === 'RATE_PLAN_CONTRACT'
}
assert(guessed, 'a non-boolean publicOfferable is rejected')

assert(isInternalOnlyRatePlanCode('catalog-test-100'), 'catalog test is internal')
assert(isInternalOnlyRatePlanCode('STAGING-PUBLIC-E2E'), 'QA code is internal ignoring case')
assert(!isInternalOnlyRatePlanCode('STANDARD'), 'commercial codes are not internal')

const api = readFileSync(new URL('../api/rates.ts', import.meta.url), 'utf8')
const pageSource = readFileSync(new URL('../pages/rates/RatesPage.tsx', import.meta.url), 'utf8')
const types = readFileSync(new URL('../types/index.ts', import.meta.url), 'utf8')
assert(api.includes('parseAdminRatePlanPage') && api.includes('parseAdminRatePlan'), 'admin rate reads parse the contract')
assert(api.includes('publicOfferable: input.publicOfferable'), 'create sends publicOfferable')
assert(api.includes('body.publicOfferable = input.publicOfferable'), 'update sends publicOfferable')
assert(!api.includes("listRatePlans") || !/export async function listRatePlans[\s\S]*mocks\/db/.test(api), 'listRatePlans has no mock db fallback')
assert(pageSource.includes('Доступний для бронювання на сайті'), 'Ukrainian public toggle label')
assert(pageSource.includes('має бути активним і мати коректні ціни'), 'explains active and priced')
assert(pageSource.includes('canEditPublicOfferable'), 'toggle is role and internal-code gated')
assert(pageSource.includes('toast.success') && pageSource.includes('await update.mutateAsync'), 'save waits for the API')
assert(!pageSource.includes('publicOfferable: true //') && !pageSource.includes("publicOfferable ?? true"), 'no optimistic true fallback')
assert(pageSource.includes('StayPricingSections'), 'existing pricing screens remain')
assert(types.includes('publicOfferable: boolean'), 'RatePlan requires the flag')
assert(pageSource.includes('RATE_PLAN_CONTRACT'), 'contract errors surface in the rates UI')
assert(!pageSource.includes('mocks/db'), 'rates page does not read mock inventory')

assert(ratePlanSiteState({ code: 'catalog-test-100', publicOfferable: true }) === 'internal', 'test code stays internal even if the flag is true')
assert(ratePlanSiteState({ code: 'STANDARD', publicOfferable: false }) === 'admin-only', 'commercial flag false is admin-only')
assert(ratePlanSiteState({ code: 'STANDARD', publicOfferable: true }) === 'public-candidate', 'true is a candidate, not a guaranteed public booking')
assert(RATE_PLAN_SITE_LABEL.internal === 'Внутрішній / тест', 'internal label')
assert(enablingPublicOffer(false, true), 'false to true needs publication')
assert(!enablingPublicOffer(true, true), 'already public does not ask again')
assert(nextPublicOffer(false, true, false) === false, 'checkbox cannot turn public without confirmation')
assert(nextPublicOffer(false, true, true) === true, 'confirmation allows publication')
assert(nextPublicOffer(true, true, false) === true, 'already public stays without a new confirmation')
assert(PUBLIC_OFFER_CONFIRM_TITLE.length > 0 && PUBLIC_OFFER_CONFIRM_DETAIL.includes('publicOfferable'), 'confirmation explains the flag is not sufficient')
assert(PUBLIC_OFFER_CONFIRM_DETAIL.includes('нічні ціни'), 'confirmation says existing bookings keep night prices')
assert(pageSource.includes('PUBLIC_OFFER_CONFIRM_TITLE') && pageSource.includes('Дозволити на сайті'), 'UI asks before publication')
assert(pageSource.includes('beginRatePlanSave'), 'save uses a duplicate-submit gate')
assert(pageSource.includes('RATE_PLAN_UNCERTAIN_MESSAGE'), 'timeout does not invite an automatic resubmit')
assert(!pageSource.includes('mutateAsync({ id: item.id, input })\n              await update.mutateAsync'), 'save does not call update twice')

const idle = { busy: false, uncertain: false }
const started = beginRatePlanSave(idle)
assert(started?.busy === true, 'first save starts')
assert(beginRatePlanSave(started!) === null, 'second click is ignored')
assert(beginRatePlanSave(finishRatePlanSave('uncertain')) === null, 'timeout keeps the gate closed')
assert(beginRatePlanSave(finishRatePlanSave('error'))?.busy === true, 'validation error can be corrected and sent again')

assert(classifyRatePlanSaveError(new ApiError('timeout', 0, 'TIMEOUT')) === 'uncertain', 'timeout is uncertain')
assert(classifyRatePlanSaveError(new ApiError('down', 503)) === 'uncertain', '5xx is uncertain')
assert(classifyRatePlanSaveError(new ApiError('no', 403, 'FORBIDDEN')) === 'forbidden', 'permission error')
assert(classifyRatePlanSaveError(new ApiError('bad', 400, 'VALIDATION_ERROR', ['code: має містити лише великі латинські літери'])) === 'validation', 'validation error')
assert(RATE_PLAN_UNCERTAIN_MESSAGE.includes('Не надсилайте'), 'uncertain copy forbids a blind retry')

const uah = formatMoneyAmount('2000.00')
assert(uah.includes('₴') && !uah.includes('USD') && !uah.includes('$'), 'prices render in hryvnia')

const hooks = readFileSync(new URL('../hooks/useHotel.ts', import.meta.url), 'utf8')
const createHook = hooks.slice(hooks.indexOf('export function useCreateAdminRatePlan'))
const updateHook = hooks.slice(hooks.indexOf('export function useUpdateAdminRatePlan'))
assert(createHook.indexOf('retry: false') < createHook.indexOf('export function useAdminCancellationPolicies'), 'create tariff mutation does not retry')
assert(updateHook.indexOf('retry: false') < updateHook.indexOf('export function useAdminCancellationPolicies'), 'update tariff mutation does not retry')

console.log('PASS: admin rate plans parse publicOfferable without a mock fallback')
