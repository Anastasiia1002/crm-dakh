import type { Amenity, AmenityCategory } from '@/types'

export const AMENITY_CATEGORY_ORDER: readonly AmenityCategory[] = [
  'SECURITY',
  'VIEW',
  'BATHROOM',
  'OTHER_COMFORTS',
  'ENTERTAINMENT',
  'HEATING_COOLING',
  'INTERNET_WORKSPACE',
  'KITCHEN',
  'SPA',
  'NEARBY',
  'OUTDOOR',
  'OTHER',
]

export const AMENITY_CATEGORY_LABEL: Record<AmenityCategory, string> = {
  SECURITY: 'Безпека',
  VIEW: 'Краєвиди',
  BATHROOM: 'Ванна кімната',
  OTHER_COMFORTS: 'Комфорт',
  ENTERTAINMENT: 'Розваги',
  HEATING_COOLING: 'Опалення та охолодження',
  INTERNET_WORKSPACE: 'Інтернет і робоче місце',
  KITCHEN: 'Кухня',
  SPA: 'SPA',
  NEARBY: 'Поруч',
  OUTDOOR: 'На відкритому повітрі',
  OTHER: 'Інше',
}

export function sameAmenityKeys(left: readonly string[], right: readonly string[]) {
  if (left.length !== right.length) return false
  const keys = new Set(left)
  return right.every((key) => keys.has(key))
}

/**
 * Undefined means the request must omit amenityKeys.
 * An empty array is returned only when the administrator cleared a loaded selection.
 */
export function amenityKeysForSave(
  baseline: readonly string[] | null,
  selected: readonly string[] | null,
): string[] | undefined {
  if (!baseline || !selected) return undefined
  if (sameAmenityKeys(baseline, selected)) return undefined
  return [...selected]
}

export function amenitySearchText(amenity: Pick<Amenity, 'labelUk' | 'category'>) {
  return `${amenity.labelUk} ${AMENITY_CATEGORY_LABEL[amenity.category]}`.toLocaleLowerCase('uk')
}

export function visibleAmenities(catalog: readonly Amenity[], selected: readonly string[], query: string) {
  const selectedKeys = new Set(selected)
  const needle = query.trim().toLocaleLowerCase('uk')
  return catalog
    .filter((amenity) => amenity.isActive || selectedKeys.has(amenity.key))
    .filter((amenity) => needle.length === 0 || amenitySearchText(amenity).includes(needle))
    .slice()
    .sort((left, right) => left.sortOrder - right.sortOrder || left.key.localeCompare(right.key))
}

export function amenityGroups(catalog: readonly Amenity[], selected: readonly string[], query: string) {
  const visible = visibleAmenities(catalog, selected, query)
  return AMENITY_CATEGORY_ORDER.map((category) => ({
    category,
    label: AMENITY_CATEGORY_LABEL[category],
    items: visible.filter((amenity) => amenity.category === category),
  })).filter((group) => group.items.length > 0)
}

export function toggleAmenityKey(selected: readonly string[], key: string) {
  return selected.includes(key) ? selected.filter((item) => item !== key) : [...selected, key]
}
