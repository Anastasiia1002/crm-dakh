/**
 * Read-only current prices calendar. Run: npx --yes tsx src/lib/current-prices.verify.ts
 */
import { readFileSync } from 'node:fs'
import {
  CURRENT_PRICE_GUEST_NOW,
  CURRENT_PRICE_LABEL,
  CURRENT_PRICE_SAVED_LATER,
  CURRENT_PRICES_MAX_NIGHTS,
  currentPriceNightView,
} from './current-prices.js'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

const weekday = currentPriceNightView({
  date: '2026-12-04',
  guestAmount: '2000.00',
  guestKind: 'test',
  scheduledAmount: '3505.00',
  missing: false,
})
assert(weekday.guestAmount === '2000.00' && weekday.scheduledAmount === '3505.00', 'weekday overlay sits beside the guest amount')
assert(weekday.guestCaption === CURRENT_PRICE_GUEST_NOW, 'staff see what guests pay now')
assert(weekday.scheduledCaption === CURRENT_PRICE_SAVED_LATER, 'unpublished commercial is saved for later')
assert(weekday.badges.includes(CURRENT_PRICE_LABEL.test), 'QA amount is marked as a test price')
assert(weekday.badges.includes(CURRENT_PRICE_LABEL.unpublished), 'unpublished commercial is labelled')

const fallback = currentPriceNightView({
  date: '2026-10-08',
  guestAmount: null,
  guestKind: null,
  scheduledAmount: '4500.00',
  missing: false,
})
assert(fallback.scheduledAmount === '4500.00' && fallback.guestAmount === null, 'type-level fallback is the unpublished amount')
assert(fallback.badges.includes(CURRENT_PRICE_LABEL.unpublished), 'unpublished fallback is labelled')

const missing = currentPriceNightView({
  date: '2026-12-04',
  guestAmount: null,
  guestKind: null,
  scheduledAmount: null,
  missing: true,
})
assert(missing.badges.includes(CURRENT_PRICE_LABEL.missing), 'uncovered nights say the price is unset')
assert(CURRENT_PRICES_MAX_NIGHTS === 62, 'calendar stays within the server night cap')

const api = readFileSync(new URL('../api/rates.ts', import.meta.url), 'utf8')
const calendar = readFileSync(new URL('../pages/rates/CurrentPricesCalendar.tsx', import.meta.url), 'utf8')
const page = readFileSync(new URL('../pages/rates/RatesPage.tsx', import.meta.url), 'utf8')
const hooks = readFileSync(new URL('../hooks/useHotel.ts', import.meta.url), 'utf8')
assert(api.includes('/api/admin/rates/prices/calendar'), 'calendar reads the staff GET')
assert(!api.includes("getCurrentPricesCalendar") || !/export async function getCurrentPricesCalendar[\s\S]*mocks\/db/.test(api), 'calendar has no mock db fallback')
assert(!calendar.includes('previewPriceWorkspace') && !calendar.includes('applyPriceWorkspace'), 'date changes do not preview or apply prices')
assert(!calendar.includes('usePreviewPriceWorkspace') && !calendar.includes('useApplyPriceWorkspace'), 'calendar does not mount write mutations')
assert(calendar.includes('group.label'), 'group headings come from the API labels')
assert(calendar.includes('Змінити ціни'), 'editor is behind Змінити ціни')
assert(page.includes('CurrentPricesCalendar') && page.includes('PriceWorkspace'), 'Ціни defaults to the calendar and keeps the editor')
assert(!page.includes('Додати тариф'), 'rate-plan management stays out of Ціни')
assert(hooks.includes("queryKey: ['admin-current-prices'"), 'calendar query is read-only')
assert(hooks.includes("'admin-current-prices'"), 'apply refreshes the calendar after a write elsewhere')

console.log('PASS: current prices calendar is a read-only staff view')
