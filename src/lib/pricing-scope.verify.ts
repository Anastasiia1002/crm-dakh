/**
 * Pricing rules are category-scoped. Run: npx --yes tsx src/lib/pricing-scope.verify.ts
 */
import { readFileSync } from 'node:fs'
import {
  allCategoriesScopeCopy,
  categoryScopeCopy,
  categoryUnitCount,
  dayPriceSaveAllowed,
  lengthStayRoomTypeIdsForSave,
  roomTypeIdsForUnits,
  selectedCategoriesScopeCopy,
  unselectedUnitsSharingType,
} from './pricing-scope'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

const units = [
  { roomTypeId: 'type-a' },
  { roomTypeId: 'type-a' },
  { roomTypeId: 'type-b' },
]

assert(categoryUnitCount(units, 'type-a') === 2, 'two units share type-a')
assert(categoryUnitCount(units, 'type-b') === 1, 'one unit on type-b')
assert(categoryUnitCount(units, 'type-c') === 0, 'missing type is zero')
assert(categoryScopeCopy(0).includes('ще немає'), 'empty category copy')
assert(categoryScopeCopy(1).includes('1 фізична одиниця'), 'single unit copy')
assert(categoryScopeCopy(2).includes('спільне для всіх'), 'shared category copy')
assert(allCategoriesScopeCopy().includes('усі номери'), 'hotel-wide copy names units')
assert(selectedCategoriesScopeCopy(0) === allCategoriesScopeCopy(), 'empty selection is hotel-wide')
assert(selectedCategoriesScopeCopy(1).includes('1 категорія'), 'one category copy')
assert(!categoryScopeCopy(2).includes('окремий номер як виняток'), 'does not invent unit pricing')

const named = [
  { id: 'room-1', roomTypeId: 'type-a', title: 'Буковина' },
  { id: 'room-2', roomTypeId: 'type-a', title: 'Карпати' },
  { id: 'cottage-1', roomTypeId: 'type-b', title: 'Будинок 1' },
]
assert(JSON.stringify(roomTypeIdsForUnits(named, ['room-1', 'cottage-1'])) === JSON.stringify(['type-a', 'type-b']), 'selected units map to distinct types')
const shared = unselectedUnitsSharingType(named, ['room-1'])
assert(shared.length === 1 && shared[0]?.titles.join(',') === 'Карпати', 'unticked sibling of a shared type is named')

const page = readFileSync(new URL('../pages/rates/StayPricingSections.tsx', import.meta.url), 'utf8')
assert(page.includes('окремий номер'), 'day-price copy keeps category scope')
assert(page.includes('categoryScopeCopy'), 'day-price table shows unit count')
assert(page.includes('selectedCategoriesScopeCopy'), 'length-stay table shows category scope')
assert(!page.includes('ціна лише для цього номера'), 'no physical-room price claim')
assert(page.includes('Зимовий сезон'), 'winter season is the example')
assert(page.includes('Перша ніч'), 'inclusive start is labeled')
assert(page.includes('Цю ціну також отримають'), 'shared type warning names the other units')
assert(page.includes('ScrollableFormDialog'), 'season and length-stay dialogs pin the footer')
assert(page.includes('useAllAdminRooms'), 'pricing loads every room page')
assert(!page.includes('limit: 100, active: true'), 'pricing selectors are not capped at the first page')
const blocked = lengthStayRoomTypeIdsForSave({ catalogComplete: false, roomTypeIds: [] })
assert(blocked === null, 'incomplete catalog does not become an all-room rule')
const hotelWide = lengthStayRoomTypeIdsForSave({ catalogComplete: true, roomTypeIds: [] })
assert(JSON.stringify(hotelWide) === '[]', 'a complete empty selection stays the all-category payload')
const chosen = lengthStayRoomTypeIdsForSave({ catalogComplete: true, roomTypeIds: ['type-a'] })
assert(JSON.stringify(chosen) === JSON.stringify(['type-a']), 'selected categories are unchanged')
assert(dayPriceSaveAllowed(false) === false, 'day price is not saved from a partial room list')
assert(dayPriceSaveAllowed(true) === true, 'day price can be saved from a complete room list')

console.log('PASS: pricing rules stay category-scoped; unit count is visible')
