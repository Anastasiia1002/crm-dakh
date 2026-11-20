/**
 * Promo management uses the hotel API. Run: npx --yes tsx src/lib/promo-codes.verify.ts
 */
import { readFileSync } from 'node:fs'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

const api = readFileSync(new URL('../api/promoCodes.ts', import.meta.url), 'utf8')
const page = readFileSync(new URL('../pages/promo-codes/PromoCodesPage.tsx', import.meta.url), 'utf8')

assert(api.includes('/api/admin/promo-codes'), 'promo API path')
assert(!api.includes('mocks/db'), 'promo API is not the local mock')
assert(page.includes('Назва / опис'), 'description column')
assert(page.includes('Ліміт використань'), 'usage limit column')
assert(page.includes('Використано'), 'usage count column')
assert(page.includes('на окремий тип номера'), 'explains hotel-wide accommodation discount')
assert(page.includes('Застосувати') === false, 'apply action stays on the booking form')
assert(page.includes('ScrollableFormDialog'), 'promo dialog pins the footer')
assert(page.includes('Дії для промокоду'), 'row actions sit in a named Дії menu')
assert(page.includes('ActionsMenu'), 'promo actions use the shared dropdown')
assert(page.includes('ConfirmDialog'), 'delete keeps a confirmation')
assert(page.includes('collisionPadding'), 'the menu stays in the viewport')
assert(page.includes('flex flex-col gap-4 md:gap-5'), 'toolbar stays 16–24px above the list and empty state')
assert(page.includes('<PageHeader'), 'create sits in the page header toolbar')
assert(page.includes('MobileList'), 'mobile cards follow the same page stack')

console.log('PASS: promo codes are managed through the hotel API')
