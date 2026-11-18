/**
 * Read-only current prices calendar. Run: npx --yes tsx src/lib/current-prices.verify.ts
 */
import { readFileSync } from 'node:fs'
import { CURRENT_PRICE_LABEL, CURRENT_PRICES_MAX_NIGHTS, currentPriceAmount } from './current-prices.js'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

assert(
  currentPriceAmount({ date: '2026-12-04', amount: '3505.00', missing: false, source: 'commercial' }) === '3505.00',
  'effective amount is shown',
)
assert(
  currentPriceAmount({ date: '2026-12-04', amount: null, missing: true, source: 'missing' }) === null,
  'uncovered nights are empty',
)
assert(CURRENT_PRICE_LABEL.missing === 'Ціну не задано', 'unset copy')
assert(CURRENT_PRICES_MAX_NIGHTS === 62, 'calendar stays within the server night cap')

const calendar = readFileSync(new URL('../pages/rates/CurrentPricesCalendar.tsx', import.meta.url), 'utf8')
const page = readFileSync(new URL('../pages/rates/RatesPage.tsx', import.meta.url), 'utf8')
const hooks = readFileSync(new URL('../hooks/useHotel.ts', import.meta.url), 'utf8')
assert(!calendar.includes('Тестова ціна'), 'calendar does not label test prices')
assert(!calendar.includes('Збережено на потім'), 'calendar does not keep unpublished badges')
assert(!calendar.includes('type="date"'), 'calendar uses the shared date picker')
assert(calendar.includes('Ціну не задано') || calendar.includes('CURRENT_PRICE_LABEL.missing'), 'unset cells keep staff copy')
assert(page.includes('CurrentPricesCalendar') && page.includes('PriceWorkspace'), 'Ціни defaults to the calendar and keeps the editor')
assert(hooks.includes("queryKey: ['admin-current-prices'"), 'calendar query is read-only')
assert(hooks.includes("'admin-current-prices'"), 'apply refreshes the calendar after a write elsewhere')

console.log('PASS: current prices calendar shows effective amounts')
