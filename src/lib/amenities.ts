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

function readAmenityKey(value: unknown): string | null {
  if (typeof value === 'string') {
    const key = value.trim()
    return key ? key : null
  }
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  for (const field of ['key', 'amenityKey', 'amenity_key'] as const) {
    if (typeof record[field] === 'string' && record[field].trim()) return record[field].trim()
  }
  return null
}

function readKeyList(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null
  const keys: string[] = []
  const seen = new Set<string>()
  for (const item of value) {
    const key = readAmenityKey(item)
    if (!key || seen.has(key)) continue
    seen.add(key)
    keys.push(key)
  }
  return keys
}

/**
 * Keys persisted on a room type. `null` means the assignment list has not arrived yet
 * and must not be saved as an empty selection.
 */
export function assignedAmenityKeys(
  type: { amenities?: unknown; amenityKeys?: unknown } | null | undefined,
): string[] | null {
  if (!type) return null
  const fromAmenities = readKeyList(type.amenities)
  const fromKeys = readKeyList(type.amenityKeys)
  if (fromAmenities && fromAmenities.length > 0) return fromAmenities
  if (fromKeys) return fromKeys
  if (fromAmenities) return fromAmenities
  return null
}

/** Apply server assignments without wiping an unsaved picker draft. */
export function syncAmenitySelection(input: {
  loadedKeys: string[] | null
  baseline: string[] | null
  selected: string[] | null
}): { baseline: string[] | null; selected: string[] | null } {
  if (input.loadedKeys === null) {
    return { baseline: null, selected: input.selected }
  }
  const dirty =
    input.baseline !== null &&
    input.selected !== null &&
    !sameAmenityKeys(input.baseline, input.selected)
  if (dirty) return { baseline: input.baseline, selected: input.selected }
  return { baseline: [...input.loadedKeys], selected: [...input.loadedKeys] }
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
