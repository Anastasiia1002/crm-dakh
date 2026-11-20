/**
 * Shared CRM mobile list cards. Run: npx --yes tsx src/lib/mobile-list.verify.ts
 */
import { readFileSync } from 'node:fs'
import { formatCapacityGuests } from './format'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

assert(formatCapacityGuests(1) === 'До 1 гостя', '1 guest genitive')
assert(formatCapacityGuests(2) === 'До 2 гостей', '2 guests')
assert(formatCapacityGuests(4) === 'До 4 гостей', '4 guests')
assert(formatCapacityGuests(5) === 'До 5 гостей', '5 guests')
assert(formatCapacityGuests(21) === 'До 21 гостя', '21 guests')
assert(formatCapacityGuests(22) === 'До 22 гостей', '22 guests')

const list = readFileSync(new URL('../components/ui/mobile-list.tsx', import.meta.url), 'utf8')
assert(list.includes('size-11'), 'action slot is 44px')
assert(list.includes('items-start'), 'ellipsis aligns to the first title line')
assert(list.includes('break-words'), 'long titles wrap')
assert(list.includes('md:hidden'), 'cards stay off the desktop table')
assert(list.includes('stopPropagation'), 'actions do not trigger card navigation')
assert(list.includes('overflow-x-hidden'), 'card lists do not scroll the page sideways')

const pages = [
  ['accommodations', readFileSync(new URL('../pages/accommodations/AccommodationsPage.tsx', import.meta.url), 'utf8')],
  ['services', readFileSync(new URL('../pages/services/ServicesPage.tsx', import.meta.url), 'utf8')],
  ['bookings', readFileSync(new URL('../components/bookings/AdminBookingTable.tsx', import.meta.url), 'utf8')],
  ['guests', readFileSync(new URL('../components/guests/GuestTable.tsx', import.meta.url), 'utf8')],
  ['promo', readFileSync(new URL('../pages/promo-codes/PromoCodesPage.tsx', import.meta.url), 'utf8')],
  ['users', readFileSync(new URL('../pages/users/UsersPage.tsx', import.meta.url), 'utf8')],
] as const

for (const [name, source] of pages) {
  assert(source.includes('MobileList') && source.includes('MobileCardHeader'), `${name} uses the shared mobile card`)
}

const accommodations = pages[0][1]
assert(accommodations.includes('unitDisplayLabel'), 'accommodation card shows the full name')
assert(accommodations.includes('formatCapacityGuests'), 'capacity uses Ukrainian guest plurals')
assert(accommodations.includes('catalogActivityLabel'), 'activity badge stays under the name')
assert(accommodations.includes('MobileCardDetail') && accommodations.includes('Закрито'), 'closures are a labeled detail')

const bookings = pages[2][1]
assert(bookings.includes('/admin/guests/'), 'guest name still opens the client')
assert(bookings.includes('/admin/bookings/${booking.id}'), 'booking body still opens the booking')
assert(bookings.includes('adminGuestName'), 'guest title is preserved')

const chessboard = readFileSync(new URL('../components/calendar/Chessboard.tsx', import.meta.url), 'utf8')
const prices = readFileSync(new URL('../pages/rates/CurrentPricesCalendar.tsx', import.meta.url), 'utf8')
assert(!chessboard.includes('MobileList'), 'chessboard stays a specialized grid')
assert(!prices.includes('MobileList'), 'pricing calendar stays a specialized grid')

console.log('PASS: shared mobile list cards')
