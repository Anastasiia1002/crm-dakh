/**
 * Dense tables keep row actions reachable without horizontal scrolling.
 * Run: npx --yes tsx src/lib/table-actions.verify.ts
 */
import { readFileSync } from 'node:fs'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

const table = readFileSync(new URL('../components/ui/table.tsx', import.meta.url), 'utf8')
const menu = readFileSync(new URL('../components/ui/actions-menu.tsx', import.meta.url), 'utf8')
const promo = readFileSync(new URL('../pages/promo-codes/PromoCodesPage.tsx', import.meta.url), 'utf8')
const services = readFileSync(new URL('../pages/services/ServicesPage.tsx', import.meta.url), 'utf8')
const users = readFileSync(new URL('../pages/users/UsersPage.tsx', import.meta.url), 'utf8')
const accommodations = readFileSync(new URL('../pages/accommodations/AccommodationsPage.tsx', import.meta.url), 'utf8')
const pricing = readFileSync(new URL('../pages/rates/StayPricingSections.tsx', import.meta.url), 'utf8')
const audit = readFileSync(new URL('../pages/audit/AuditLogPanel.tsx', import.meta.url), 'utf8')

assert(table.includes('overflow-x-auto'), 'wide tables still scroll horizontally')
assert(table.includes('stickyActions'), 'action cells can stick to the viewport edge')
assert(table.includes('sticky right-0'), 'the actions column stays on the right while the table scrolls')
assert(menu.includes("label = 'Дії'"), 'row actions share a compact Дії menu')
assert(menu.includes('collisionPadding={16}'), 'the menu stays inside the viewport')
assert(menu.includes('aria-haspopup="menu"'), 'the menu trigger is announced as a menu')
assert(menu.includes('onCloseAutoFocus'), 'closing the menu restores focus to the trigger')

for (const [name, source] of [
  ['promo', promo],
  ['services', services],
  ['users', users],
  ['accommodations', accommodations],
  ['pricing', pricing],
  ['audit', audit],
] as const) {
  assert(source.includes('stickyActions'), `${name} pins the last column`)
}

assert(promo.includes('Дії') && promo.includes('DropdownMenu'), 'promo row actions stay in a dropdown')
assert(services.includes('ActionsMenu'), 'services use the shared actions menu')
assert(users.includes('ActionsMenu'), 'users use the shared actions menu')
assert(accommodations.includes('ActionsMenu'), 'accommodations use the shared actions menu')
assert(pricing.includes('ActionsMenu'), 'pricing rules use the shared actions menu')
assert(!pricing.includes('flex justify-end gap-2'), 'pricing rows no longer expose a wide button pair')

console.log('PASS: dense table actions stay reachable')
