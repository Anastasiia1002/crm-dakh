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
assert(table.includes('bg-[var(--row-bg)]'), 'sticky action cells paint the shared row background token')
assert(table.includes('transition-none'), 'row and cells share the same instant background timing')
assert(!table.includes('transition-colors'), 'rows do not animate background separately from sticky cells')
assert(table.includes('--table-row-bg-hover'), 'row hover uses an opaque shared token')
assert(table.includes('--table-row-bg-alt'), 'alternating rows use an opaque shared token')
assert(table.includes('--table-row-bg-selected'), 'selected rows use an opaque shared token')
assert(table.includes('focus-within:[--row-bg:var(--table-row-bg-hover)]'), 'focus-within matches the hovered row')
const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8')
assert(css.includes('--table-row-bg: var(--surface)'), 'row tokens are opaque surface mixes')
assert(css.includes('color-mix(in srgb, var(--surface-muted)'), 'hover and stripe tokens stay opaque')
assert(menu.includes('hover:bg-transparent'), 'the ellipsis trigger stays transparent over the cell')
assert(menu.includes('data-[state=open]:bg-transparent'), 'an open menu does not paint a contrasting trigger patch')
assert(menu.includes('transition-none'), 'the ellipsis does not lag the row hover')
assert(menu.includes('focus-visible:bg-transparent'), 'keyboard focus uses the ring, not a cell patch')
assert(menu.includes("label = 'Дії'"), 'row actions share a compact Дії menu')
assert(menu.includes('EllipsisVertical'), 'the trigger is the existing vertical ellipsis')
assert(menu.includes('size-11'), 'the trigger keeps a 44px hit area')
assert(menu.includes('aria-label={label}'), 'the icon trigger keeps a contextual accessible name')
assert(menu.includes('bg-transparent'), 'the trigger background matches the row and sticky cell')
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

assert(promo.includes('ActionsMenu') && promo.includes('Дії для промокоду'), 'promo row actions stay in the shared menu')
assert(services.includes('Дії для послуги'), 'service actions name the row')
assert(users.includes('Дії для'), 'user actions name the row')
assert(accommodations.includes('Дії для'), 'accommodation actions name the row')
assert(pricing.includes('Дії для правила') && pricing.includes('Дії для знижки'), 'pricing actions name the row')
assert(services.includes('ActionsMenu'), 'services use the shared actions menu')
assert(users.includes('ActionsMenu'), 'users use the shared actions menu')
assert(accommodations.includes('ActionsMenu'), 'accommodations use the shared actions menu')
assert(pricing.includes('ActionsMenu'), 'pricing rules use the shared actions menu')
assert(!pricing.includes('flex justify-end gap-2'), 'pricing rows no longer expose a wide button pair')

console.log('PASS: dense table actions stay reachable')
