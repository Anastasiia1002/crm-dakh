import { ApiError } from '@/lib/api-error'
import { formatMoneyAmount, normalizeMoneyString } from '@/lib/format'

/** Booking picker reads GET /api/admin/services (active-only). Management uses GET ?active=all. */
export const ADMIN_SERVICE_CATALOG_AVAILABLE = true

export const ADMIN_SERVICE_NAME_MAX = 100
export const ADMIN_SERVICE_DESCRIPTION_MAX = 500
export const SERVICE_PRICE_CHANGE_NOTICE =
  'Нова ціна застосовуватиметься до нових послуг у бронюваннях. Вартість уже збережених послуг не зміниться.'
export const SERVICE_DEACTIVATE_CONFIRMATION =
  'Вимкнути послугу? Її більше не можна буде додати до нових бронювань. У вже створених бронюваннях вона залишиться.'

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

export type AdminManagedService = {
  id: string
  name: string
  description: string | null
  price: string
  currency: 'UAH'
  active: boolean
  createdAt: string
  updatedAt: string
}

export type AdminServiceCreateInput = {
  name: string
  description?: string | null
  price: string
  active?: boolean
}

export type AdminServicePatchInput = {
  name?: string
  description?: string | null
  price?: string
  active?: boolean
}

export type ServiceStatusFilter = 'all' | 'active' | 'inactive'

export type AdminServiceFormValues = {
  name: string
  description: string
  price: string
  active: boolean
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

export function parseManagedAdminService(raw: unknown): AdminManagedService {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new ApiError('Каталог послуг має некоректний рядок.', 0, 'SERVICE_CATALOG_INVALID')
  }
  const record = raw as Record<string, unknown>
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
  if (typeof record.active !== 'boolean') {
    throw new ApiError('Каталог послуг має некоректний статус.', 0, 'SERVICE_CATALOG_INVALID')
  }
  if (typeof record.createdAt !== 'string' || record.createdAt.trim().length === 0) {
    throw new ApiError('Каталог послуг має некоректну дату створення.', 0, 'SERVICE_CATALOG_INVALID')
  }
  if (typeof record.updatedAt !== 'string' || record.updatedAt.trim().length === 0) {
    throw new ApiError('Каталог послуг має некоректну дату оновлення.', 0, 'SERVICE_CATALOG_INVALID')
  }
  return {
    id: record.id.trim(),
    name: record.name.trim(),
    description: record.description === undefined || record.description === null ? null : record.description,
    price,
    currency: 'UAH',
    active: record.active,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }
}

export function parseManagedAdminServiceCatalog(raw: unknown): AdminManagedService[] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new ApiError('Каталог послуг має некоректну відповідь.', 0, 'SERVICE_CATALOG_INVALID')
  }
  const items = (raw as { items?: unknown }).items
  if (!Array.isArray(items)) {
    throw new ApiError('Каталог послуг має некоректну відповідь.', 0, 'SERVICE_CATALOG_INVALID')
  }
  return items.map(parseManagedAdminService)
}

export function cleanServiceDescription(value: string): string | null {
  const text = value.trim()
  return text ? text : null
}

export function validateServiceName(value: string): string | null {
  const name = value.trim()
  if (name.length < 1) return 'Вкажіть назву послуги.'
  if (name.length > ADMIN_SERVICE_NAME_MAX) return `Назва має бути до ${ADMIN_SERVICE_NAME_MAX} символів.`
  return null
}

export function validateServiceDescription(value: string): string | null {
  if (value.trim().length > ADMIN_SERVICE_DESCRIPTION_MAX) {
    return `Опис має бути до ${ADMIN_SERVICE_DESCRIPTION_MAX} символів.`
  }
  return null
}

export function validateServicePrice(value: unknown): { ok: true; price: string } | { ok: false; error: string } {
  if (typeof value !== 'string') return { ok: false, error: 'Ціна має бути десятковим рядком.' }
  const trimmed = value.trim()
  if (trimmed === '0' || trimmed === '0.0' || trimmed === '0.00') {
    return { ok: false, error: 'Ціна має бути щонайменше 0.01 ₴.' }
  }
  const price = normalizeMoneyString(trimmed)
  if (!price) return { ok: false, error: 'Невідʼємне число з не більше ніж двома знаками.' }
  if (price === '0.00') return { ok: false, error: 'Ціна має бути щонайменше 0.01 ₴.' }
  return { ok: true, price }
}

export function serviceWriteBodyHasForbiddenFields(body: Record<string, unknown>): string[] {
  return ['hotelId', 'currency', 'totalAmount', 'unitPrice', 'totalPrice', 'quantity'].filter((key) =>
    Object.prototype.hasOwnProperty.call(body, key),
  )
}

export function buildAdminServiceCreateBody(
  input: AdminServiceFormValues,
): { ok: true; body: AdminServiceCreateInput } | { ok: false; error: string; field?: keyof AdminServiceFormValues } {
  const nameError = validateServiceName(input.name)
  if (nameError) return { ok: false, error: nameError, field: 'name' }
  const descriptionError = validateServiceDescription(input.description)
  if (descriptionError) return { ok: false, error: descriptionError, field: 'description' }
  const price = validateServicePrice(input.price)
  if (!price.ok) return { ok: false, error: price.error, field: 'price' }
  const body: AdminServiceCreateInput = {
    name: input.name.trim(),
    description: cleanServiceDescription(input.description),
    price: price.price,
    active: input.active,
  }
  if (serviceWriteBodyHasForbiddenFields(body as unknown as Record<string, unknown>).length > 0) {
    return { ok: false, error: 'Некоректні дані запиту.' }
  }
  return { ok: true, body }
}

export function buildAdminServicePatchBody(
  current: AdminManagedService,
  input: AdminServiceFormValues,
):
  | { ok: true; body: AdminServicePatchInput }
  | { ok: false; error: string; field?: keyof AdminServiceFormValues }
  | { ok: false; empty: true } {
  const nameError = validateServiceName(input.name)
  if (nameError) return { ok: false, error: nameError, field: 'name' }
  const descriptionError = validateServiceDescription(input.description)
  if (descriptionError) return { ok: false, error: descriptionError, field: 'description' }
  const price = validateServicePrice(input.price)
  if (!price.ok) return { ok: false, error: price.error, field: 'price' }
  const description = cleanServiceDescription(input.description)
  const body: AdminServicePatchInput = {}
  if (input.name.trim() !== current.name) body.name = input.name.trim()
  if (description !== current.description) body.description = description
  if (price.price !== current.price) body.price = price.price
  if (input.active !== current.active) body.active = input.active
  if (Object.keys(body).length === 0) return { ok: false, empty: true }
  if (serviceWriteBodyHasForbiddenFields(body as unknown as Record<string, unknown>).length > 0) {
    return { ok: false, error: 'Некоректні дані запиту.' }
  }
  return { ok: true, body }
}

export function filterManagedServices(
  items: readonly AdminManagedService[],
  options: { query: string; status: ServiceStatusFilter },
): AdminManagedService[] {
  const needle = options.query.trim().toLowerCase()
  return items.filter((item) => {
    if (options.status === 'active' && !item.active) return false
    if (options.status === 'inactive' && item.active) return false
    if (needle && !item.name.toLowerCase().includes(needle)) return false
    return true
  })
}
