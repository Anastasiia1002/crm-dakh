/**
 * Read-only current prices calendar. Run: npx --yes tsx src/lib/current-prices.verify.ts
 */
import { readFileSync } from 'node:fs'
import { CURRENT_PRICE_LABEL, CURRENT_PRICES_MAX_NIGHTS, currentPriceAmount } from './current-prices.js'
import { formatInclusiveDateRange } from './format.js'

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
assert(calendar.includes('allowPast'), 'read-only calendar keeps past nights selectable')
assert(calendar.includes('Ціну не задано') || calendar.includes('CURRENT_PRICE_LABEL.missing'), 'unset cells keep staff copy')
assert(page.includes('CurrentPricesCalendar') && page.includes('PriceWorkspace'), 'Ціни defaults to the calendar and keeps the editor')
assert(page.includes('onSaved') && page.includes('roomIds'), 'successful apply returns to the calendar with the same units and nights')
assert(!calendar.includes('end || lastNight'), 'first click does not keep the previous last night')
assert(calendar.includes('visibleRange'), 'calendar query stays on the last complete range while picking')
assert(hooks.includes("queryKey: ['admin-current-prices'"), 'calendar query is read-only')
assert(hooks.includes("'admin-current-prices'"), 'apply refreshes the calendar after a write elsewhere')

const picker = readFileSync(new URL('../components/dates/DateRangePicker.tsx', import.meta.url), 'utf8')
const workspace = readFileSync(new URL('../pages/rates/PriceWorkspace.tsx', import.meta.url), 'utf8')
assert(picker.includes('formatInclusiveDateRange'), 'range field shows one formatted period')
assert(!picker.includes('>З<') && !picker.includes('>По<'), 'range picker no longer splits З and По')
assert(picker.includes('inRange'), 'selected nights stay highlighted')
assert(picker.includes('nextInclusiveRange'), 'picker completes the range on the second click')
assert(picker.includes('triggerRef'), 'Escape returns focus to the period trigger')
assert(picker.includes('keyboardDayFromTarget'), 'keyboard selection follows the focused day')
assert(picker.includes('flushSync'), 'open focuses a day before the next click')
assert(!picker.includes('requestAnimationFrame'), 'picker focus is not delayed past the next click')
assert(calendar.includes('label="Період"'), 'current prices period uses the shared field label')
assert(workspace.includes('label="Період"'), 'editor period uses the shared field label')
assert(!workspace.includes('type="date"'), 'editor does not use native date inputs')
assert(workspace.includes('allowPast={false}'), 'editor blocks past nights')
assert(workspace.includes('onSaved'), 'successful apply closes through the parent')
assert(!workspace.includes('Тестова ціна') && !workspace.includes('Збережено на потім') && !workspace.includes('Не опубліковано'), 'daily editor has no unpublished labels')
assert(formatInclusiveDateRange('2026-11-18', '2026-11-30') === '18–30 листопада 2026', 'same-month period copy')
assert(formatInclusiveDateRange('2026-11-18', '2026-12-05') === '18 листопада – 5 грудня 2026', 'cross-month period copy')
assert(formatInclusiveDateRange('2026-12-30', '2027-01-02') === '30 грудня 2026 – 2 січня 2027', 'cross-year period copy')

console.log('PASS: current prices calendar shows effective amounts')
