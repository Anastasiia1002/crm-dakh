/**
 * Run: npx --yes tsx src/lib/inventory-status.verify.ts
 */
import {
  INVENTORY_ACTIVE_FILTER_LABEL,
  activeFilterToQuery,
  catalogActivityLabel,
  type InventoryActiveFilter,
} from './inventory-status'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

assert(activeFilterToQuery('active') === true, 'active → true')
assert(activeFilterToQuery('archived') === false, 'archived → false')
assert(activeFilterToQuery('all') === undefined, 'all → undefined')
assert(INVENTORY_ACTIVE_FILTER_LABEL.active === 'Активний', 'filter value is Активний')
assert(INVENTORY_ACTIVE_FILTER_LABEL.archived === 'Неактивний', 'filter value is Неактивний')
assert(catalogActivityLabel(true) === 'Активний' && catalogActivityLabel(false) === 'Неактивний', 'badge matches filter')

const filters: InventoryActiveFilter[] = ['active', 'archived', 'all']
assert(filters.length === 3, 'three filter modes')

console.log('All inventory-status checks passed.')
