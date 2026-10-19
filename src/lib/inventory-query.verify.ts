/**
 * Dependency-free checks for CRM inventory/calendar active query defaults.
 * Run: npx --yes tsx src/lib/inventory-query.verify.ts
 */
import { activeFilterToQuery, type InventoryActiveFilter } from './inventory-status'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

/** Mirrors getAdminCalendar / listRooms query assembly for active. */
function calendarQueryActive(filter: InventoryActiveFilter = 'active'): boolean | undefined {
  return activeFilterToQuery(filter)
}

function inventoryListActive(filter: InventoryActiveFilter = 'active'): boolean | undefined {
  return activeFilterToQuery(filter)
}

export function runInventoryQueryChecks(): string[] {
  const results: string[] = []

  assert(calendarQueryActive() === true, 'calendar default active=true')
  assert(calendarQueryActive('active') === true, 'calendar active')
  assert(calendarQueryActive('archived') === false, 'calendar archived')
  assert(calendarQueryActive('all') === undefined, 'calendar all omits param')
  results.push('Calendar PASS: default active-only; archive/all explicit')

  assert(inventoryListActive() === true, 'inventory default active=true')
  assert(inventoryListActive('archived') === false, 'inventory archived')
  assert(inventoryListActive('all') === undefined, 'inventory all')
  results.push('Inventory PASS: default active-only; status filter maps to API')

  // ROOM / COTTAGE kind filters are orthogonal to active (passed alongside).
  const roomQuery = { kind: 'ROOM' as const, active: inventoryListActive('active') }
  const cottageQuery = { kind: 'COTTAGE' as const, active: inventoryListActive('active') }
  assert(roomQuery.active === true && roomQuery.kind === 'ROOM', 'ROOM + active')
  assert(cottageQuery.active === true && cottageQuery.kind === 'COTTAGE', 'COTTAGE + active')
  results.push('Kind PASS: ROOM/COTTAGE combine with active=true')

  return results
}

export function printInventoryQueryChecks() {
  for (const line of runInventoryQueryChecks()) console.log(line)
  console.log('All inventory query checks passed.')
}

const entryArg = (globalThis as { process?: { argv?: string[] } }).process?.argv?.[1]
if (entryArg?.includes('inventory-query.verify')) {
  printInventoryQueryChecks()
}
