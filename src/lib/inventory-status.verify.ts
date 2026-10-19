/**
 * Run: npx --yes tsx src/lib/inventory-status.verify.ts
 */
import { activeFilterToQuery, type InventoryActiveFilter } from './inventory-status'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

assert(activeFilterToQuery('active') === true, 'active → true')
assert(activeFilterToQuery('archived') === false, 'archived → false')
assert(activeFilterToQuery('all') === undefined, 'all → undefined')

const filters: InventoryActiveFilter[] = ['active', 'archived', 'all']
assert(filters.length === 3, 'three filter modes')

console.log('All inventory-status checks passed.')
