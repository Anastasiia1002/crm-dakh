/**
 * Admin dashboard summary contract, dates, and labels.
 * Run: npx --yes tsx src/lib/dashboard-summary.verify.ts
 */
import { readFileSync } from 'node:fs'
import { ApiError } from './api-error'
import { errorMessage } from './errors'
import {
  BOOKINGS_OVERLAP_HINT,
  DASHBOARD_MAX_PERIOD_DAYS,
  PAYMENTS_UNAVAILABLE_LABEL,
  bookingValueLabel,
  defaultDashboardPeriod,
  inclusiveCalendarDays,
  occupancyPercentLabel,
  parseAdminDashboardSummary,
  parseDashboardPeriod,
} from './dashboard-summary'
import { resolveDashboardView } from './dashboard-state'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

function populatedSummary() {
  return {
    timezone: 'Europe/Kyiv',
    period: { from: '2026-10-01', to: '2026-10-30' },
    today: '2026-10-30',
    bookings: { total: 4, confirmed: 2, cancelled: 1 },
    arrivals: { checkInsToday: 1 },
    departures: { checkOutsToday: 1 },
    occupancy: { occupied: 2, available: 1, blocked: 1, sellable: 3, percent: '66.67' },
    bookingValue: { amount: '210.15', currency: 'UAH' },
    payments: { available: false, reason: 'PAYMENT_LEDGER_NOT_IN_USE' },
  }
}

function zeroSummary() {
  return {
    timezone: 'Europe/Kyiv',
    period: { from: '2026-10-01', to: '2026-10-30' },
    today: '2026-10-30',
    bookings: { total: 0, confirmed: 0, cancelled: 0 },
    arrivals: { checkInsToday: 0 },
    departures: { checkOutsToday: 0 },
    occupancy: { occupied: 0, available: 0, blocked: 0, sellable: 0, percent: null },
    bookingValue: { amount: '0.00', currency: 'UAH' },
    payments: { available: false, reason: 'PAYMENT_LEDGER_NOT_IN_USE' },
  }
}

function main() {
  const kyivLate = defaultDashboardPeriod(new Date('2026-10-29T22:30:00Z'), 'Europe/Kyiv')
  assert(kyivLate.to === '2026-10-30' && kyivLate.from === '2026-10-01', 'hotel-local month start through today in Kyiv')
  const utcLate = defaultDashboardPeriod(new Date('2026-10-29T22:30:00Z'), 'UTC')
  assert(utcLate.to === '2026-10-29' && utcLate.from === '2026-10-01', 'UTC calendar date is not shifted to Kyiv')

  const one = parseDashboardPeriod('2026-10-30', '2026-10-30')
  assert(one.ok && one.days === 1, 'a single inclusive day is valid')
  const leap = parseDashboardPeriod('2024-01-01', '2024-12-31')
  assert(leap.ok && leap.days === 366, 'a leap year fits the 366-day cap')
  assert(inclusiveCalendarDays('2024-01-01', '2024-12-31') === DASHBOARD_MAX_PERIOD_DAYS, 'inclusive leap-year length')
  const inverted = parseDashboardPeriod('2026-10-31', '2026-10-30')
  assert(!inverted.ok && inverted.message.includes('не може бути раніше'), 'inverted range is rejected')
  const tooLong = parseDashboardPeriod('2024-01-01', '2025-01-02')
  assert(!tooLong.ok && tooLong.message.includes('366'), 'more than 366 days is rejected')
  const bad = parseDashboardPeriod('31.10.2026', '2026-10-31')
  assert(!bad.ok, 'non ISO dates are rejected')

  const readyZeros = resolveDashboardView({ summaryEndpoint: true, phase: 'ready' })
  assert(readyZeros.kind === 'ready', 'all-zero 200 is ready, not empty')
  assert(resolveDashboardView({ summaryEndpoint: true, phase: 'empty' }).kind !== 'ready', 'empty remains distinct from zeros')

  const populated = parseAdminDashboardSummary(populatedSummary())
  assert(populated.bookings.total === 4 && populated.bookings.confirmed === 2, 'populated booking counts')
  assert(populated.occupancy.percent === '66.67', 'populated occupancy percent')
  assert(bookingValueLabel(populated.bookingValue.amount, populated.bookingValue.currency) === '210,15\u00a0₴', 'UAH grouping and comma')
  assert(occupancyPercentLabel(populated.occupancy.percent) === '66,67%', 'percent uses a comma')
  assert(populated.payments.available === false, 'payments stay unavailable')

  const zeros = parseAdminDashboardSummary(zeroSummary())
  assert(zeros.bookings.total === 0 && zeros.arrivals.checkInsToday === 0, 'zeros are zeros')
  assert(zeros.occupancy.percent === null, 'null occupancy percent is preserved')
  assert(occupancyPercentLabel(null) === '—', 'null occupancy is an em dash, not 0%')
  assert(bookingValueLabel('0.00', 'UAH') === '0,00\u00a0₴', 'zero UAH still formats')

  let contractError = false
  try {
    parseAdminDashboardSummary({ ...populatedSummary(), payments: { available: true, amount: '10.00' } })
  } catch (error) {
    contractError = error instanceof ApiError && error.code === 'DASHBOARD_CONTRACT'
  }
  assert(contractError, 'a payment amount is not a valid summary')

  let missing = false
  try {
    parseAdminDashboardSummary({ ...populatedSummary(), bookings: { total: 1 } })
  } catch {
    missing = true
  }
  assert(missing, 'partial booking counts are rejected')

  assert(errorMessage(new ApiError('x', 401, 'UNAUTHORIZED')).includes('Сесія недійсна'), '401 copy')
  assert(errorMessage(new ApiError('', 403, 'FORBIDDEN')) === 'Недостатньо прав.', '403 copy')
  assert(errorMessage(new ApiError('Cannot GET', 404)) === 'Cannot GET', '404 keeps server message')
  assert(errorMessage(new ApiError('x', 500)).includes('тимчасово недоступний'), '500 copy')
  assert(errorMessage(new ApiError('x', 0, 'TIMEOUT')).includes('занадто довго'), 'timeout copy')
  assert(errorMessage(new ApiError('x', 0, 'NETWORK')).includes('тимчасово недоступний'), 'network copy')

  assert(PAYMENTS_UNAVAILABLE_LABEL === 'Облік оплат недоступний', 'payments label')
  assert(BOOKINGS_OVERLAP_HINT.includes('перетинає вибрані дати'), 'overlap hint is not created-at')
  assert(!BOOKINGS_OVERLAP_HINT.includes('Дохід') && !PAYMENTS_UNAVAILABLE_LABEL.includes('грн отримано'), 'no revenue wording')

  const api = readFileSync(new URL('../api/admin-dashboard.ts', import.meta.url), 'utf8')
  assert(api.includes('/api/admin/dashboard/summary'), 'GET summary path')
  assert(api.includes('signal'), 'AbortSignal is forwarded')

  const hook = readFileSync(new URL('../hooks/useAdminDashboard.ts', import.meta.url), 'utf8')
  assert(hook.includes('ADMIN_DASHBOARD_SUMMARY_QUERY_KEY'), 'query key is shared')
  assert(hook.includes('from') && hook.includes('to'), 'query key includes the period')
  assert(hook.includes('retry: false'), 'summary does not auto-retry')
  assert(hook.includes('period.ok'), 'invalid ranges do not fetch')

  const page = readFileSync(new URL('../pages/dashboard/DashboardPage.tsx', import.meta.url), 'utf8')
  assert(!page.includes('useDashboard(') && !page.includes('getDashboard('), 'page does not compute KPIs from the mock list')
  assert(!page.includes('.reduce(') && !page.includes('occupancyPercent('), 'KPIs are not derived from eight bookings')
  assert(page.includes('summary.bookings.total'), 'total comes from the summary payload')
  console.log('PASS: dashboard summary contract')
}

main()
