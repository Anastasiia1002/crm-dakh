/**
 * Analytics filters, contract parser, and page honesty.
 * Run: npx --yes tsx src/lib/analytics-summary.verify.ts
 */
import { readFileSync } from 'node:fs'
import { ApiError } from './api-error'
import {
  ANALYTICS_NONE,
  analyticsPresetRange,
  analyticsSearchParams,
  barPercent,
  bookingListHref,
  defaultAnalyticsFilters,
  moneyOrUnavailable,
  parseAdminAnalyticsSummary,
  parseAnalyticsSearch,
} from './analytics-summary'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

function summaryFixture() {
  return {
    timezone: 'Europe/Kyiv',
    dateType: 'stay',
    period: { from: '2026-11-01', to: '2026-11-30' },
    definitions: { bookingValue: 'цінність', revenue: 'оплати' },
    financial: {
      bookingValue: { available: true, amount: '100.00', currency: 'UAH', bookingCount: 2, includesCancelled: false },
      revenue: { available: false, reason: 'PAYMENT_LEDGER_NOT_IN_USE' },
      averageCheck: { available: true, amount: '50.00', currency: 'UAH', bookingCount: 2, includesCancelled: false },
      outstanding: { available: false, reason: 'PAYMENT_LEDGER_NOT_IN_USE' },
      discounts: { available: true, amount: '10.00', currency: 'UAH', bookingCount: 2, includesCancelled: false },
    },
    bookings: { total: 2, cancelled: 0, completed: 1, incomplete: 1 },
    cancellations: {
      currentlyCancelled: { count: 0, amount: '0.00', currency: 'UAH' },
      cancelledDuringPeriod: { count: 0, amount: '0.00', currency: 'UAH' },
    },
    sources: [{ source: 'ADMIN', label: 'Прямий продаж', count: 2, percent: '100.00' }],
    accommodations: [{ roomId: 'r1', name: '101', roomTypeName: 'Стандарт', active: true, count: 2 }],
    guests: { unique: 1, new: 1, repeatVisits: 0 },
  }
}

function main() {
  const november = analyticsPresetRange('currentMonth', new Date('2026-11-15T10:00:00Z'), 'Europe/Kyiv')
  assert(november.from === '2026-11-01' && november.to === '2026-11-30', 'current month')
  const previous = analyticsPresetRange('previousMonth', new Date('2026-11-15T10:00:00Z'), 'Europe/Kyiv')
  assert(previous.from === '2026-10-01' && previous.to === '2026-10-31', 'previous month')
  const year = analyticsPresetRange('currentYear', new Date('2026-11-15T10:00:00Z'), 'Europe/Kyiv')
  assert(year.from === '2026-01-01' && year.to === '2026-12-31', 'year')

  const parsed = parseAnalyticsSearch(new URLSearchParams('dateType=created&from=2026-11-04&to=2026-11-04&rooms=none'))
  assert(parsed.dateType === 'created' && parsed.roomIds === ANALYTICS_NONE, 'url none rooms')
  assert(!JSON.stringify(parsed).toLowerCase().includes('guest'), 'filters do not keep guest fields')

  const share = analyticsSearchParams({
    ...defaultAnalyticsFilters(new Date('2026-11-15T10:00:00Z'), 'Europe/Kyiv'),
    statuses: ['CANCELLED'],
  })
  assert(share.get('statuses') === 'CANCELLED' && !share.has('rooms'), 'all rooms omitted from url')

  const href = bookingListHref(
    { dateType: 'stay', from: '2026-11-01', to: '2026-11-30', categoryIds: 'all', roomIds: 'all', statuses: 'all' },
    'cancelled',
  )
  assert(href.includes('status=CANCELLED') && href.includes('checkIn=2026-11-01') && href.includes('checkOut=2026-12-01'), 'kpi stay link')
  assert(!href.includes('guest'), 'booking list href has no guest data')

  const summary = parseAdminAnalyticsSummary(summaryFixture())
  assert(summary.financial.revenue.available === false, 'revenue unavailable')
  assert(moneyOrUnavailable(summary.financial.revenue) === 'Недоступно', 'revenue label')
  assert(barPercent(1, 3) === '33', 'bar percent')

  let rejected = false
  try {
    parseAdminAnalyticsSummary({
      ...summaryFixture(),
      financial: { ...summaryFixture().financial, revenue: { available: true, amount: '1.00' } },
    })
  } catch (error) {
    rejected = error instanceof ApiError
  }
  assert(rejected, 'parser rejects invented payments')

  const page = readFileSync(new URL('../pages/analytics/AnalyticsPage.tsx', import.meta.url), 'utf8')
  assert(page.includes('useAdminAnalyticsSummary'), 'page reads the analytics endpoint')
  assert(!page.includes('mocks/db') && !page.includes('getDashboard'), 'no mock dashboard data')
  assert(page.includes("label=\"Дохід\"") && page.includes('summary.financial.revenue'), 'income kpi is present')
  assert(page.includes('moneyOrUnavailable'), 'unavailable money uses the shared label helper')
  assert(page.includes('Огляд готелю'), 'operational overview is preserved in copy')
  assert(page.includes('overflow-y-auto') && page.includes('min-w-0'), 'filters and charts avoid horizontal overflow')
  assert(page.includes('aria-busy'), 'loading state')

  const dashboard = readFileSync(new URL('../pages/dashboard/DashboardPage.tsx', import.meta.url), 'utf8')
  assert(dashboard.includes('Огляд готелю') && dashboard.includes('useAdminDashboardSummary'), 'hotel overview page unchanged as the operational dashboard')
  assert(!dashboard.includes('useAdminAnalyticsSummary'), 'overview does not switch to the analytics endpoint')

  const nav = readFileSync(new URL('../router/nav.ts', import.meta.url), 'utf8')
  assert(nav.includes("label: 'Аналітика'") && nav.includes("label: 'Огляд'"), 'both nav items exist')

  const router = readFileSync(new URL('../router/index.tsx', import.meta.url), 'utf8')
  assert(router.includes("path: 'analytics'") && router.includes('path: \'bookings\''), 'analytics is an extra route')

  console.log('PASS: analytics summary, url filters, and overview isolation')
}

main()
