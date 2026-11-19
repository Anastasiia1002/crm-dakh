/**
 * Directory and catalog search must be case-insensitive, including Ukrainian Cyrillic.
 * Run: npx --yes tsx src/lib/text-search.verify.ts
 */
import { textIncludesSearch } from './text-search.js'
import { filterManagedServices } from './admin-services.js'
import { toAdminBookingListQuery } from './admin-booking-view.js'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

assert(textIncludesSearch('Іван Коваль', 'іван'), 'lowercase Ukrainian matches stored title case')
assert(textIncludesSearch('Іван Коваль', 'ІВАН'), 'uppercase Ukrainian matches the same record')
assert(textIncludesSearch('Іван Коваль', ' ІвАн '), 'mixed case and surrounding whitespace match')
assert(!textIncludesSearch('Іван Коваль', 'петро'), 'unrelated names stay out')
assert(textIncludesSearch('Буковина', 'БУКОВИНА'), 'accommodation names fold Ukrainian case')

const services = [
  {
    id: 's1',
    name: 'Сніданок',
    description: null,
    price: '100.00',
    currency: 'UAH' as const,
    active: true,
    bookable: false,
    chargeBasis: 'PER_PERSON_DAY' as const,
    minQuantity: null,
    maxQuantity: null,
    sortOrder: 0,
    category: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
]
assert(filterManagedServices(services, { query: 'сніданок', status: 'all' }).length === 1, 'service lowercase')
assert(filterManagedServices(services, { query: 'СНІДАНОК', status: 'all' }).length === 1, 'service uppercase')
assert(filterManagedServices(services, { query: ' СніДаНок ', status: 'all' }).length === 1, 'service mixed')

const query = toAdminBookingListQuery({
  page: 2,
  limit: 20,
  search: '  КОВАЛЬ  ',
  status: 'all',
  source: 'all',
  roomId: 'all',
  checkIn: '',
  checkOut: '',
  createdLocalFrom: '',
  createdLocalTo: '',
  cancelledFrom: '',
  cancelledTo: '',
})
assert(query.search === 'КОВАЛЬ' && query.page === 2 && query.limit === 20, 'trimmed search keeps pagination')

console.log('PASS: case-insensitive Ukrainian search')
