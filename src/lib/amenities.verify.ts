/**
 * Amenity selection rules for the accommodation editor.
 * Run: npx --yes tsx src/lib/amenities.verify.ts
 */
import { readFileSync } from 'node:fs'
import { amenityGroups, amenityKeysForSave, sameAmenityKeys, toggleAmenityKey, visibleAmenities } from './amenities'
import type { Amenity } from '@/types'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

const wifi: Amenity = {
  id: 'wifi',
  key: 'wifi',
  category: 'INTERNET_WORKSPACE',
  labelUk: 'Wi-Fi',
  iconKey: 'wifi',
  sortOrder: 1,
  isActive: true,
}
const kitchen: Amenity = {
  id: 'kitchen',
  key: 'kitchen',
  category: 'KITCHEN',
  labelUk: 'Кухня',
  iconKey: 'kitchen',
  sortOrder: 2,
  isActive: true,
}
const sauna: Amenity = {
  id: 'sauna',
  key: 'sauna',
  category: 'SPA',
  labelUk: 'Баня',
  iconKey: 'sauna',
  sortOrder: 3,
  isActive: false,
}
const catalog = [kitchen, wifi, sauna]

assert(sameAmenityKeys(['wifi', 'kitchen'], ['kitchen', 'wifi']), 'selection ignores order')
assert(amenityKeysForSave(null, ['wifi']) === undefined, 'unloaded selection is omitted')
assert(amenityKeysForSave(['wifi'], null) === undefined, 'missing draft is omitted')
assert(amenityKeysForSave(['wifi'], ['wifi']) === undefined, 'unchanged selection is omitted')
const cleared = amenityKeysForSave(['wifi'], [])
assert(Array.isArray(cleared) && cleared.length === 0, 'explicit clear sends an empty array')
assert(JSON.stringify(amenityKeysForSave(['wifi'], ['wifi', 'kitchen'])) === JSON.stringify(['wifi', 'kitchen']), 'a change is sent')

const searched = visibleAmenities(catalog, ['sauna'], 'кух')
assert(searched.map((item) => item.key).join() === 'kitchen', 'search filters labels without dropping the saved set')
assert(visibleAmenities(catalog, [], '').some((item) => item.key === 'sauna') === false, 'inactive amenities stay hidden until selected')
assert(visibleAmenities(catalog, ['sauna'], '').some((item) => item.key === 'sauna'), 'an assigned inactive amenity stays visible')
assert(amenityGroups(catalog, ['wifi'], 'wifi').every((group) => group.category !== 'KITCHEN'), 'empty categories stay hidden')
assert(toggleAmenityKey(['wifi'], 'kitchen').join() === 'wifi,kitchen', 'toggle adds')
assert(toggleAmenityKey(['wifi', 'kitchen'], 'wifi').join() === 'kitchen', 'toggle removes')

const page = readFileSync(new URL('../pages/accommodations/AccommodationEditorPage.tsx', import.meta.url), 'utf8')
const picker = readFileSync(new URL('../components/accommodations/AmenityPicker.tsx', import.meta.url), 'utf8')
const api = readFileSync(new URL('../api/accommodations.ts', import.meta.url), 'utf8')
assert(page.includes('AmenityPicker'), 'the accommodation editor includes amenities')
assert(page.includes('amenityKeysForSave'), 'save distinguishes omitted and empty selections')
assert(page.includes('guestFieldsChanged || nextAmenityKeys !== undefined'), 'saving other fields does not require an amenity rewrite')
assert(picker.includes('Зручності'), 'the section title is Ukrainian')
assert(picker.includes('aria-pressed'), 'amenity controls expose pressed state')
assert(picker.includes('Пошук зручності'), 'amenities can be searched')
assert(api.includes('amenityKeys'), 'the room-type update can send amenity keys')
assert(api.includes("if (input.amenityKeys !== undefined)"), 'an omitted amenity list is not sent')

console.log('amenities.verify: ok')
