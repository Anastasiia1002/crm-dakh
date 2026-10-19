/** CRM inventory / calendar visibility filter for Room / RoomType `active`. */
export type InventoryActiveFilter = 'active' | 'archived' | 'all'

/** Map UI filter to admin list/calendar `active` query param. */
export function activeFilterToQuery(filter: InventoryActiveFilter): boolean | undefined {
  if (filter === 'active') return true
  if (filter === 'archived') return false
  return undefined
}

export const INVENTORY_ACTIVE_FILTER_LABEL: Record<InventoryActiveFilter, string> = {
  active: 'Активні',
  archived: 'Вимкнені',
  all: 'Усі',
}
