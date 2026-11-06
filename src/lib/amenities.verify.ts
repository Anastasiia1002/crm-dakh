/**
 * Amenity selection rules for the accommodation editor.
 * Run: npx --yes tsx src/lib/amenities.verify.ts
 */
import { readFileSync } from 'node:fs'
import {
  amenityGroups,
  amenityKeysForSave,
  assignedAmenityKeys,
  sameAmenityKeys,
  syncAmenitySelection,
  toggleAmenityKey,
  visibleAmenities,
} from './amenities'
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

assert(
  JSON.stringify(assignedAmenityKeys({ amenities: [wifi, kitchen] })) === JSON.stringify(['wifi', 'kitchen']),
  'an existing type hydrates from amenities[].key',
)
assert(JSON.stringify(assignedAmenityKeys({ amenities: [] })) === JSON.stringify([]), 'a type with no assignments loads as empty')
assert(assignedAmenityKeys({}) === null, 'a missing assignment field is not treated as an empty save')
assert(assignedAmenityKeys(null) === null, 'an unloaded type is not treated as an empty save')
assert(
  JSON.stringify(assignedAmenityKeys({ amenities: [], amenityKeys: ['wifi', 'fireplace'] })) ===
    JSON.stringify(['wifi', 'fireplace']),
  'amenityKeys wins when amenities arrives empty',
)
assert(
  JSON.stringify(assignedAmenityKeys({ amenityKeys: ['nearby-lake'] })) === JSON.stringify(['nearby-lake']),
  'amenityKeys hydrates when amenities is omitted',
)
assert(
  JSON.stringify(assignedAmenityKeys({ amenities: [{ key: 'firewood', label: 'Дрова' }] })) === JSON.stringify(['firewood']),
  'public-shaped amenity objects still expose key',
)

const pendingCatalog = syncAmenitySelection({ loadedKeys: null, baseline: null, selected: null })
assert(pendingCatalog.selected === null, 'selection stays pending until the room type assignments arrive')
assert(pendingCatalog.baseline === null, 'an unloaded assignment is not a loaded empty list')

const existing = syncAmenitySelection({ loadedKeys: ['wifi', 'kitchen'], baseline: null, selected: null })
assert(existing.selected?.join() === 'wifi,kitchen', 'saved amenities are preselected')
assert(existing.baseline?.join() === 'wifi,kitchen', 'the loaded set is the dirty-check baseline')

const emptyType = syncAmenitySelection({ loadedKeys: [], baseline: null, selected: null })
assert(Array.isArray(emptyType.selected) && emptyType.selected.length === 0, 'a type without amenities starts empty')

const afterCatalog = syncAmenitySelection({
  loadedKeys: ['wifi', 'kitchen'],
  baseline: emptyType.baseline,
  selected: emptyType.selected,
})
assert(afterCatalog.selected?.join() === 'wifi,kitchen', 'assignments that arrive after an empty first payload are applied')

const unrelatedEdit = syncAmenitySelection({
  loadedKeys: ['wifi', 'kitchen'],
  baseline: ['wifi', 'kitchen'],
  selected: ['wifi', 'kitchen'],
})
assert(unrelatedEdit.selected?.join() === 'wifi,kitchen', 'reopening the same assignments keeps the selection')
assert(amenityKeysForSave(unrelatedEdit.baseline, unrelatedEdit.selected) === undefined, 'unrelated field saves omit amenityKeys')

const added = toggleAmenityKey(existing.selected ?? [], 'fireplace')
assert(added.join() === 'wifi,kitchen,fireplace', 'an amenity can be added')
const removed = toggleAmenityKey(added, 'wifi')
assert(removed.join() === 'kitchen,fireplace', 'an amenity can be removed')
assert(JSON.stringify(amenityKeysForSave(existing.baseline, removed)) === JSON.stringify(['kitchen', 'fireplace']), 'edits are sent')

const draft = syncAmenitySelection({
  loadedKeys: ['wifi'],
  baseline: ['wifi', 'kitchen'],
  selected: ['wifi'],
})
assert(draft.selected?.join() === 'wifi', 'a later refetch does not restore amenities the administrator already removed')
assert(amenityKeysForSave(['wifi'], [])?.length === 0, 'clearing every amenity sends an empty array')

const page = readFileSync(new URL('../pages/accommodations/AccommodationEditorPage.tsx', import.meta.url), 'utf8')
const picker = readFileSync(new URL('../components/accommodations/AmenityPicker.tsx', import.meta.url), 'utf8')
const api = readFileSync(new URL('../api/accommodations.ts', import.meta.url), 'utf8')
assert(page.includes('AmenityPicker'), 'the accommodation editor includes amenities')
assert(page.includes('assignedAmenityKeys'), 'the editor reads persisted assignment keys')
assert(page.includes('syncAmenitySelection'), 'the editor reapplies assignments when they arrive asynchronously')
assert(page.includes('selected={selectedAmenities}'), 'the picker is bound to loaded keys, not a coerced empty list')
assert(page.includes('amenityKeysForSave'), 'save distinguishes omitted and empty selections')
assert(page.includes('guestFieldsChanged || nextAmenityKeys !== undefined'), 'saving other fields does not require an amenity rewrite')
assert(picker.includes('Зручності'), 'the section title is Ukrainian')
assert(picker.includes('aria-pressed'), 'amenity controls expose pressed state')
assert(picker.includes('Пошук зручності'), 'amenities can be searched')
assert(picker.includes('Завантажуємо збережені зручності'), 'the picker does not show Обрано 0 before assignments load')
assert(api.includes('amenityKeys'), 'the room-type update can send amenity keys')
assert(api.includes("if (input.amenityKeys !== undefined)"), 'an omitted amenity list is not sent')
assert(api.includes('withAssignedAmenities'), 'GET room types keep assignment keys even when the payload uses amenityKeys')

console.log('amenities.verify: ok')
