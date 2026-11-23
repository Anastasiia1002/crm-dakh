/**
 * Pricing rules are keyed by RoomType (category), not by physical Room.
 * Several units can share one category; a rule then applies to every one of them.
 */

export function categoryUnitCount(units: readonly { roomTypeId: string }[], roomTypeId: string): number {
  return units.filter((unit) => unit.roomTypeId === roomTypeId).length
}

export function categoryScopeCopy(unitCount: number): string {
  if (unitCount <= 0) {
    return 'У цій категорії ще немає фізичних номерів чи будиночків'
  }
  if (unitCount === 1) {
    return '1 фізична одиниця в цій категорії'
  }
  return `${unitCount} фізичні одиниці в цій категорії — правило спільне для всіх`
}

export function allCategoriesScopeCopy(): string {
  return 'Усі категорії (усі номери й будиночки готелю)'
}

export function selectedCategoriesScopeCopy(categoryCount: number): string {
  if (categoryCount <= 0) return allCategoriesScopeCopy()
  if (categoryCount === 1) return '1 категорія (усі фізичні одиниці цієї категорії)'
  return `${categoryCount} категорії (усі фізичні одиниці обраних категорій)`
}

export function roomTypeIdsForUnits(
  units: readonly { id: string; roomTypeId: string }[],
  selectedIds: readonly string[],
): string[] {
  const selected = new Set(selectedIds)
  return [...new Set(units.filter((unit) => selected.has(unit.id)).map((unit) => unit.roomTypeId))]
}

/**
 * Length-stay save payload. An empty roomTypeIds list means every category.
 * That payload is returned only after the room catalog loaded completely.
 */
export function lengthStayRoomTypeIdsForSave(input: {
  catalogComplete: boolean
  roomTypeIds: readonly string[]
}): string[] | null {
  if (!input.catalogComplete) return null
  return [...input.roomTypeIds]
}

export type LengthStayKind = 'ROOM' | 'COTTAGE'

const KIND_LABEL: Record<LengthStayKind, string> = {
  ROOM: 'Номери',
  COTTAGE: 'Будиночки',
}

export function lengthStayKindLabel(kind: LengthStayKind) {
  return KIND_LABEL[kind]
}

/** Hotel-wide empty list, otherwise every type in the ticked kind groups. */
export function roomTypeIdsForLengthStayKinds(
  types: readonly { id: string; kind: LengthStayKind }[],
  kinds: readonly LengthStayKind[],
): string[] {
  const unique = [...new Set(kinds)]
  if (unique.length === 0 || unique.length === 2) return []
  return types.filter((type) => unique.includes(type.kind)).map((type) => type.id)
}

export function kindsFromLengthStayRoomTypes(
  types: readonly { id: string; kind: LengthStayKind }[],
  roomTypeIds: readonly string[],
): LengthStayKind[] {
  if (roomTypeIds.length === 0) return ['ROOM', 'COTTAGE']
  const selected = new Set(roomTypeIds)
  const kinds = new Set(types.filter((type) => selected.has(type.id)).map((type) => type.kind))
  return (['ROOM', 'COTTAGE'] as const).filter((kind) => kinds.has(kind))
}

export function lengthStayRuleSummary(input: {
  minNights: number
  discountValue: string
  kinds: readonly LengthStayKind[]
  active: boolean
  nightFrom?: string | null
  nightToExclusive?: string | null
}) {
  const percent = input.discountValue.replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')
  const groups =
    input.kinds.length === 0 || input.kinds.length === 2
      ? 'Номери і будиночки'
      : input.kinds.map(lengthStayKindLabel).join(' і ')
  const window =
    input.nightFrom && input.nightToExclusive
      ? ` Ночі ${input.nightFrom} … ${input.nightToExclusive} (дата виїзду не входить).`
      : input.nightFrom
        ? ` З ночі ${input.nightFrom}.`
        : input.nightToExclusive
          ? ` До ночі перед ${input.nightToExclusive}.`
          : ''
  const state = input.active ? 'Активна.' : 'Вимкнена.'
  return `Від ${input.minNights} ночей −${percent}% на проживання (${groups}).${window} Послуги не знижуються. ${state}`
}

/**
 * Night-window writes stay off until backend #26 is deployed and this flag is set.
 * Do not infer support from a 400 or extra JSON keys.
 */
export function lengthStayNightWindowWritable() {
  return import.meta.env.VITE_LENGTH_STAY_NIGHT_WINDOW === 'true'
}

export function storedLengthStayWindow(item?: { nightFrom?: string | null; nightToExclusive?: string | null } | null) {
  const nightFrom = item?.nightFrom?.trim() ? item.nightFrom : null
  const nightToExclusive = item?.nightToExclusive?.trim() ? item.nightToExclusive : null
  return { nightFrom, nightToExclusive }
}

export function lengthStayWritePayload(input: {
  name: string
  minNights: number
  discountValue: string
  roomTypeIds: string[]
  active: boolean
  nightFrom?: string | null
  nightToExclusive?: string | null
  nightWindowWritable: boolean
}) {
  const payload = {
    name: input.name,
    minNights: input.minNights,
    discountValue: input.discountValue,
    roomTypeIds: input.roomTypeIds,
    active: input.active,
  }
  if (!input.nightWindowWritable) return payload
  return {
    ...payload,
    nightFrom: input.nightFrom || null,
    nightToExclusive: input.nightToExclusive || null,
  }
}

export const PROPOSED_LENGTH_STAY_RULES = [
  { name: 'Від 3 ночей', minNights: 3, discountValue: '10.00', kinds: ['ROOM', 'COTTAGE'] as LengthStayKind[] },
  { name: 'Від 7 ночей', minNights: 7, discountValue: '15.00', kinds: ['ROOM', 'COTTAGE'] as LengthStayKind[] },
] as const

/** A day-price rule is created only from a complete active-room catalog. */
export function dayPriceSaveAllowed(catalogComplete: boolean) {
  return catalogComplete
}

/** Units of a selected type that were not ticked. The price still applies to them. */
export function unselectedUnitsSharingType(
  units: readonly { id: string; roomTypeId: string; title: string }[],
  selectedIds: readonly string[],
): { roomTypeId: string; titles: string[] }[] {
  const selected = new Set(selectedIds)
  const typeIds = new Set(units.filter((unit) => selected.has(unit.id)).map((unit) => unit.roomTypeId))
  const notes: { roomTypeId: string; titles: string[] }[] = []
  for (const roomTypeId of typeIds) {
    const titles = units.filter((unit) => unit.roomTypeId === roomTypeId && !selected.has(unit.id)).map((unit) => unit.title)
    if (titles.length > 0) notes.push({ roomTypeId, titles })
  }
  return notes
}
