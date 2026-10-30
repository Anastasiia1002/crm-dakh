import { ApiError } from '@/lib/api-error'
import { formatMoneyAmount, normalizeMoneyString } from '@/lib/format'

/** Catalog exists: GET /api/admin/services. There is no admin write API for Service rows. */
export const ADMIN_SERVICE_CATALOG_AVAILABLE = true

export const ADMIN_SERVICE_QUANTITY_MAX = 99

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export type AdminServiceCatalogItem = {
  id: string
  name: string
  description: string | null
  price: string
  currency: 'UAH'
  active: true
}

export type AdminServiceSelection = {
  serviceId: string
  quantity: number
}

export function parseAdminServiceCatalog(raw: unknown): AdminServiceCatalogItem[] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new ApiError('Каталог послуг має некоректну відповідь.', 0, 'SERVICE_CATALOG_INVALID')
  }
  const items = (raw as { items?: unknown }).items
  if (!Array.isArray(items)) {
    throw new ApiError('Каталог послуг має некоректну відповідь.', 0, 'SERVICE_CATALOG_INVALID')
  }
  const parsed: AdminServiceCatalogItem[] = []
  for (const row of items) {
    const item = parseCatalogRow(row)
    if (item) parsed.push(item)
  }
  return parsed
}

function parseCatalogRow(row: unknown): AdminServiceCatalogItem | null {
  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    throw new ApiError('Каталог послуг має некоректний рядок.', 0, 'SERVICE_CATALOG_INVALID')
  }
  const record = row as Record<string, unknown>
  if (record.active === false) return null
  if (typeof record.id !== 'string' || !UUID_PATTERN.test(record.id.trim())) {
    throw new ApiError('Каталог послуг має некоректний ідентифікатор.', 0, 'SERVICE_CATALOG_INVALID')
  }
  if (typeof record.name !== 'string' || record.name.trim().length === 0) {
    throw new ApiError('Каталог послуг має порожню назву.', 0, 'SERVICE_CATALOG_INVALID')
  }
  if (record.description != null && typeof record.description !== 'string') {
    throw new ApiError('Каталог послуг має некоректний опис.', 0, 'SERVICE_CATALOG_INVALID')
  }
  if (typeof record.price !== 'string') {
    throw new ApiError('Каталог послуг має некоректну ціну.', 0, 'SERVICE_CATALOG_INVALID')
  }
  const price = normalizeMoneyString(record.price)
  if (!price) {
    throw new ApiError('Каталог послуг має некоректну ціну.', 0, 'SERVICE_CATALOG_INVALID')
  }
  if (record.currency !== 'UAH') {
    throw new ApiError('Каталог послуг має валюту, відмінну від UAH.', 0, 'SERVICE_CATALOG_INVALID')
  }
  if (record.active !== true) {
    throw new ApiError('Каталог послуг містить неактивний рядок.', 0, 'SERVICE_CATALOG_INVALID')
  }
  return {
    id: record.id.trim(),
    name: record.name.trim(),
    description: record.description === undefined || record.description === null ? null : record.description,
    price,
    currency: 'UAH',
    active: true,
  }
}

export function validateServiceQuantity(value: number): string | null {
  if (!Number.isInteger(value) || value < 1) return 'Кількість має бути цілим числом від 1.'
  if (value > ADMIN_SERVICE_QUANTITY_MAX) return `Кількість не може перевищувати ${ADMIN_SERVICE_QUANTITY_MAX}.`
  return null
}

export function normalizeServiceSelections(
  rows: readonly AdminServiceSelection[],
): { ok: true; items: AdminServiceSelection[] } | { ok: false; error: string } {
  const items: AdminServiceSelection[] = []
  const seen = new Set<string>()
  for (const row of rows) {
    const serviceId = row.serviceId.trim()
    if (!UUID_PATTERN.test(serviceId)) return { ok: false, error: 'Некоректна послуга.' }
    if (seen.has(serviceId)) return { ok: false, error: 'Послугу не можна додати двічі.' }
    const quantityError = validateServiceQuantity(row.quantity)
    if (quantityError) return { ok: false, error: quantityError }
    seen.add(serviceId)
    items.push({ serviceId, quantity: row.quantity })
  }
  return { ok: true, items }
}

export function serviceSelectionsEqual(
  left: readonly AdminServiceSelection[],
  right: readonly AdminServiceSelection[],
): boolean {
  if (left.length !== right.length) return false
  const byId = new Map(right.map((row) => [row.serviceId, row.quantity]))
  for (const row of left) {
    if (byId.get(row.serviceId) !== row.quantity) return false
  }
  return true
}

export function toggleServiceSelection(
  current: readonly AdminServiceSelection[],
  serviceId: string,
  selected: boolean,
): AdminServiceSelection[] {
  const without = current.filter((row) => row.serviceId !== serviceId)
  if (!selected) return without
  if (current.some((row) => row.serviceId === serviceId)) return [...current]
  return [...without, { serviceId, quantity: 1 }]
}

export function setServiceQuantity(
  current: readonly AdminServiceSelection[],
  serviceId: string,
  quantity: number,
): AdminServiceSelection[] {
  return current.map((row) => (row.serviceId === serviceId ? { ...row, quantity } : row))
}

export function catalogById(items: readonly AdminServiceCatalogItem[]) {
  return new Map(items.map((item) => [item.id, item]))
}

export function serviceDisplayName(
  serviceId: string,
  catalog: readonly AdminServiceCatalogItem[],
): string {
  const match = catalog.find((item) => item.id === serviceId)
  return match?.name ?? `Збережена послуга ${serviceId.slice(0, 8)}`
}

export function formatCatalogPrice(price: string) {
  return formatMoneyAmount(price)
}

export function savedSelectionsFromBooking(
  services: readonly { serviceId: string; quantity: number }[],
): AdminServiceSelection[] {
  const normalized = normalizeServiceSelections(services)
  return normalized.ok ? normalized.items : services.map((row) => ({ serviceId: row.serviceId, quantity: row.quantity }))
}
