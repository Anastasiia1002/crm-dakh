/** CRM inventory / calendar visibility filter for Room / RoomType `active`. */
export type InventoryActiveFilter = 'active' | 'archived' | 'all'

/** Map UI filter to admin list/calendar `active` query param. */
export function activeFilterToQuery(filter: InventoryActiveFilter): boolean | undefined {
  if (filter === 'active') return true
  if (filter === 'archived') return false
  return undefined
}

/** Catalog `active` flag only. Not occupancy and not a date block. */
export const INVENTORY_ACTIVE_FILTER_LABEL: Record<InventoryActiveFilter, string> = {
  active: 'Активний',
  archived: 'Неактивний',
  all: 'Усі',
}

export function catalogActivityLabel(active: boolean) {
  return active ? 'Активний' : 'Неактивний'
}
