/**
 * Dashboard honesty: no mock operational numbers, and explicit empty/error copy.
 * Run: npx --yes tsx src/lib/dashboard-state.verify.ts
 */
import { readFileSync } from 'node:fs'
import { adminBookingInvalidationKeys, invalidateAdminBookingQueries } from '../hooks/useBookings'
import {
  DASHBOARD_EMPTY_MESSAGE,
  DASHBOARD_ERROR_MESSAGE,
  resolveDashboardView,
} from './dashboard-state'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

function main() {
  const unavailable = resolveDashboardView({ summaryEndpoint: false, phase: 'ready' })
  assert(unavailable.kind === 'unavailable', 'a missing summary endpoint is not a ready dashboard')
  if (unavailable.kind === 'unavailable') {
    assert(!unavailable.detail.includes('%'), 'unavailable copy has no fake percentage')
    assert(unavailable.detail.includes('не показуються як отриманий дохід'), 'booking value is not labeled as paid revenue')
  }
  assert(resolveDashboardView({ summaryEndpoint: false, phase: 'empty' }).kind === 'unavailable', 'missing endpoint is not an empty period')
  assert(resolveDashboardView({ summaryEndpoint: true, phase: 'error' }).kind === 'error', 'endpoint error is an error')
  const errorView = resolveDashboardView({ summaryEndpoint: true, phase: 'error' })
  assert(errorView.kind === 'error' && errorView.message === DASHBOARD_ERROR_MESSAGE, 'error copy')
  const emptyView = resolveDashboardView({ summaryEndpoint: true, phase: 'empty' })
  assert(emptyView.kind === 'empty' && emptyView.message === DASHBOARD_EMPTY_MESSAGE, 'empty copy')
  assert(resolveDashboardView({ summaryEndpoint: true, phase: 'ready' }).kind === 'ready', 'ready only after a real endpoint')

  const page = readFileSync(new URL('../pages/dashboard/DashboardPage.tsx', import.meta.url), 'utf8')
  assert(!page.includes('getDashboard') && !page.includes('mocks/db') && !page.includes('useDashboard'), 'dashboard page does not read the mock summary')
  assert(!page.includes('occupancyPercent') && !page.includes('Дохід') && !page.includes('Виручка'), 'dashboard does not invent occupancy or revenue')
  assert(page.includes('resolveDashboardView') && page.includes('summaryEndpoint: false'), 'page stays on the unavailable contract')
  assert(page.includes('useAdminBookings'), 'recent bookings come from the admin list')
  assert(page.includes('Не вдалося завантажити дані.') && page.includes('Повторити'), 'a failed booking list can be retried')
  assert(page.includes('не підсумок за період'), 'the latest page is not described as a period total')

  const keys = adminBookingInvalidationKeys.map((key) => key[0])
  assert(new Set(keys).size === keys.length, 'booking invalidation does not repeat a query key')
  assert(keys.includes('admin-stay-calendar') && keys.includes('admin-guest-bookings'), 'stay calendar and guest history refresh after a booking change')
  assert(!keys.includes('dashboard'), 'booking mutations do not refresh a mock dashboard')
  const seen: string[] = []
  invalidateAdminBookingQueries({
    invalidateQueries(input: { queryKey: readonly unknown[] }) {
      seen.push(String(input.queryKey[0]))
    },
  } as never)
  assert(seen.length === keys.length && new Set(seen).size === seen.length, 'one invalidation pass does not duplicate requests')

  const auth = readFileSync(new URL('../hooks/useAuth.tsx', import.meta.url), 'utf8')
  const authApi = readFileSync(new URL('../api/auth.ts', import.meta.url), 'utf8')
  assert(auth.includes('queryClient.clear()'), 'logout clears the authenticated query cache')
  assert(authApi.includes('queryClient.clear()'), 'session logout clears the authenticated query cache')

  const services = readFileSync(new URL('../pages/services/ServicesPage.tsx', import.meta.url), 'utf8')
  assert(services.includes('ADMIN_SERVICE_CATALOG_BLOCKED_LABEL'), 'services page is blocked until the catalog endpoint exists')
  assert(!services.includes('useServices') && !services.includes('Додати послугу'), 'services page does not present the local catalog as hotel data')
  console.log('PASS: dashboard, invalidation, and cache clearing')
}

main()
