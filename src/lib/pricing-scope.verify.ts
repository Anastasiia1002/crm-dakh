/**
 * Pricing rules are category-scoped. Run: npx --yes tsx src/lib/pricing-scope.verify.ts
 */
import { readFileSync } from 'node:fs'
import {
  allCategoriesScopeCopy,
  categoryScopeCopy,
  categoryUnitCount,
  dayPriceSaveAllowed,
  kindsFromLengthStayRoomTypes,
  lengthStayRoomTypeIdsForSave,
  lengthStayRuleSummary,
  lengthStayScopeCopy,
  lengthStayWindowCopy,
  lengthStayWritePayload,
  PROPOSED_LENGTH_STAY_RULES,
  storedLengthStayWindow,
  roomTypeIdsForLengthStayKinds,
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
const ratesPage = readFileSync(new URL('../pages/rates/RatesPage.tsx', import.meta.url), 'utf8')
assert(page.includes('окремий номер'), 'day-price copy keeps category scope')
assert(page.includes('categoryScopeCopy'), 'day-price table shows unit count')
assert(page.includes('lengthStayScopeCopy'), 'length-stay table shows scope')
assert(page.includes('lengthStayWindowCopy'), 'length-stay table shows the stay-date window')
assert(page.includes('Номери'), 'length-stay groups rooms')
assert(page.includes('Будиночки'), 'length-stay groups cottages')
assert(page.includes('Знижок ще немає'), 'empty discounts copy')
assert(page.includes('Додайте знижку за тривалість проживання.'), 'empty discounts hint')
assert(page.includes('Додати знижку'), 'empty discounts keeps the create action')
assert(!page.includes('Запропоновані правила'), 'proposed 3/7 night rules are not shown as live catalog')
assert(ratesPage.includes('LengthStayDiscountsPanel'), 'Ціни reuses the existing length-stay panel')
assert(ratesPage.includes('Знижки'), 'Ціни has a visible Знижки tab')
assert(ratesPage.includes('автоматично до вартості проживання'), 'discounts tab states automatic stay pricing')
assert(ratesPage.includes('Додаткові послуги оплачуються окремо'), 'discounts tab keeps extras out of the discount')
assert(ratesPage.includes('однакові суми лишають промокод'), 'promo vs automatic policy stays accurate')
assert(!page.includes('ціна лише для цього номера'), 'no physical-room price claim')
assert(page.includes('Зимовий сезон'), 'winter season is the example')
assert(page.includes('Ночі сезону'), 'inclusive season nights are labeled')
assert(page.includes('Цю ціну також отримають'), 'shared type warning names the other units')
assert(page.includes('ScrollableFormDialog'), 'season and length-stay dialogs pin the footer')
assert(!page.includes('RatePlanPicker'), 'seasonal prices do not ask staff to pick a tariff')
assert(page.includes('resolvedCommercialRatePlanId'), 'new seasonal rules reuse commercial STANDARD')
assert(!page.includes('ratePlanId: values.ratePlanId'), 'edits do not rewrite the stored plan')
assert(page.includes('useAllAdminRooms'), 'pricing loads every room page')
assert(!page.includes('useAdminRooms({ page: 1, limit: 100'), 'pricing unit selectors are not capped at the first page')
assert(page.includes('useAllAdminRooms'), 'pricing loads every physical unit')
const blocked = lengthStayRoomTypeIdsForSave({ catalogComplete: false, roomTypeIds: [] })
assert(blocked === null, 'incomplete catalog does not become an all-room rule')
const hotelWide = lengthStayRoomTypeIdsForSave({ catalogComplete: true, roomTypeIds: [] })
assert(JSON.stringify(hotelWide) === '[]', 'a complete empty selection stays the all-category payload')
const chosen = lengthStayRoomTypeIdsForSave({ catalogComplete: true, roomTypeIds: ['type-a'] })
assert(JSON.stringify(chosen) === JSON.stringify(['type-a']), 'selected categories are unchanged')
assert(dayPriceSaveAllowed(false) === false, 'day price is not saved from a partial room list')
assert(dayPriceSaveAllowed(true) === true, 'day price can be saved from a complete room list')

const typed = [
  { id: 'type-a', kind: 'ROOM' as const },
  { id: 'type-b', kind: 'COTTAGE' as const },
]
assert(JSON.stringify(roomTypeIdsForLengthStayKinds(typed, ['ROOM', 'COTTAGE'])) === '[]', 'both kinds stay hotel-wide')
assert(JSON.stringify(roomTypeIdsForLengthStayKinds(typed, ['ROOM'])) === JSON.stringify(['type-a']), 'rooms map to room types')
assert(JSON.stringify(kindsFromLengthStayRoomTypes(typed, [])) === JSON.stringify(['ROOM', 'COTTAGE']), 'empty ids are both groups')
assert(PROPOSED_LENGTH_STAY_RULES[0]?.minNights === 3 && PROPOSED_LENGTH_STAY_RULES[1]?.minNights === 7, 'review draft keeps 3 and 7 night thresholds')
assert(lengthStayScopeCopy(['ROOM', 'COTTAGE']) === 'Номери і будиночки', 'both groups are hotel-wide')
assert(lengthStayWindowCopy({}).includes('Без обмеження дат'), 'missing dates are unlabeled as a window')
assert(lengthStayRuleSummary({ minNights: 3, discountValue: '10.00', kinds: ['ROOM', 'COTTAGE'], active: false }).includes('Вимкнена'), 'summary names inactive state')
assert(!lengthStayRuleSummary({ minNights: 3, discountValue: '10.00', kinds: ['ROOM', 'COTTAGE'], active: false }).includes('Без обмеження дат'), 'summary does not claim an unsaved date window')
assert(
  JSON.stringify(
    lengthStayWritePayload({
      name: 'Від 3 ночей',
      minNights: 3,
      discountValue: '10.00',
      roomTypeIds: [],
      active: false,
      nightFrom: '2026-12-01',
      nightToExclusive: '2027-03-01',
      nightWindowWritable: false,
    }),
  ) ===
    JSON.stringify({
      name: 'Від 3 ночей',
      minNights: 3,
      discountValue: '10.00',
      roomTypeIds: [],
      active: false,
    }),
  'save omits night windows until the explicit capability is on',
)
assert(
  'nightFrom' in
    lengthStayWritePayload({
      name: 'Від 3 ночей',
      minNights: 3,
      discountValue: '10.00',
      roomTypeIds: [],
      active: false,
      nightFrom: '2026-12-01',
      nightToExclusive: '2027-03-01',
      nightWindowWritable: true,
    }),
  'verified night-window API receives the dates',
)
assert(storedLengthStayWindow({ nightFrom: '2026-12-01', nightToExclusive: '' }).nightFrom === '2026-12-01', 'stored window is kept')
assert(page.includes('lengthStayNightWindowWritable'), 'length-stay form uses an explicit night-window gate')
assert(page.includes('не стирає вже записане вікно'), 'disabled window copy says existing dates stay')
assert(!page.includes('PR #26'), 'owner copy no longer waits on backend #26')
assert(!page.includes('бекенд із вікном ночей'), 'owner copy no longer waits on an undeployed night window')
const scope = readFileSync(new URL('./pricing-scope.ts', import.meta.url), 'utf8')
assert(scope.includes("VITE_LENGTH_STAY_NIGHT_WINDOW === 'true'"), 'night-window writes stay behind the configured capability')
const viteConfig = readFileSync(new URL('../../vite.config.ts', import.meta.url), 'utf8')
assert(viteConfig.includes("mode === 'production' || githubPages"), 'Silk production and Pages enable the night-window gate')
assert(viteConfig.includes("VITE_LENGTH_STAY_NIGHT_WINDOW = 'true'"), 'production builds write nightFrom/nightToExclusive')
const pages = readFileSync(new URL('../../.github/workflows/deploy.yml', import.meta.url), 'utf8')
assert(pages.includes("VITE_LENGTH_STAY_NIGHT_WINDOW: 'true'"), 'GitHub Pages build sets the night-window gate')

console.log('PASS: pricing rules stay category-scoped; unit count is visible')
