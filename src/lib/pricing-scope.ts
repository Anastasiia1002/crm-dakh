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
