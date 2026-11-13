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
export const SERVICE_PRICE_UNSET_LABEL = 'Ціну не зазначено'
export const SERVICE_DEFAULT_CREATE_PRICE = '100'
export const SERVICE_PUBLIC_NEEDS_PRICE =
  'Щоб зробити послугу доступною на сайті, вкажіть ціну або вимкніть онлайн-бронювання.'
export const SERVICE_PUBLIC_STAY_ONLY_HINT =
  'На сайті гість бачить лише активну послугу з нарахуванням «За бронювання» і встановленою ціною.'
export const ADMIN_SERVICE_QUANTITY_MAX = 99
export const ADMIN_SERVICE_CATEGORY_MAX = 40
export const ADMIN_SERVICE_SORT_ORDER_MAX = 9999

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const ADMIN_SERVICE_CHARGE_BASES = [
  'PER_STAY',
  'PER_PERSON_DAY',
  'PER_NIGHT',
  'ONE_TIME',
  'PER_TRIP',
  'PER_DAY',
] as const

export type AdminServiceChargeBasis = (typeof ADMIN_SERVICE_CHARGE_BASES)[number]

export const SERVICE_CHARGE_BASIS_LABEL: Record<AdminServiceChargeBasis, string> = {
  PER_STAY: 'За бронювання',
  PER_PERSON_DAY: 'За людину на добу',
  PER_NIGHT: 'За ніч',
  ONE_TIME: 'Разово',
  PER_TRIP: 'За поїздку',
  PER_DAY: 'За добу',
}

export const SUGGESTED_SERVICE_DEFAULTS = [
  { name: 'Сніданок', chargeBasis: 'PER_PERSON_DAY' },
  { name: 'Додаткове спальне місце', chargeBasis: 'PER_NIGHT' },
  { name: 'Ранній заїзд', chargeBasis: 'ONE_TIME' },
  { name: 'Пізній виїзд', chargeBasis: 'ONE_TIME' },
  { name: 'Трансфер', chargeBasis: 'PER_TRIP' },
  { name: 'Паркування', chargeBasis: 'PER_DAY' },
  { name: 'Проживання з твариною', chargeBasis: 'PER_DAY' },
] as const satisfies ReadonlyArray<{ name: string; chargeBasis: AdminServiceChargeBasis }>

export type AdminServiceCatalogItem = {
  id: string
  name: string
  description: string | null
  price: string
  currency: 'UAH'
  active: true
  chargeBasis: AdminServiceChargeBasis
}

export type AdminManagedService = {
  id: string
  name: string
  description: string | null
  price: string | null
  currency: 'UAH'
  active: boolean
  bookable: boolean
  chargeBasis: AdminServiceChargeBasis
  minQuantity: number | null
  maxQuantity: number | null
  sortOrder: number
  category: string | null
  createdAt: string
  updatedAt: string
}

export type AdminServiceCreateInput = {
  name: string
  description?: string | null
  price: string | null
  active?: boolean
  bookable: boolean
  chargeBasis: AdminServiceChargeBasis
  minQuantity?: number | null
  maxQuantity?: number | null
  sortOrder?: number
  category?: string | null
}

export type AdminServicePatchInput = {
  name?: string
  description?: string | null
  price?: string | null
  active?: boolean
  bookable?: boolean
  chargeBasis?: AdminServiceChargeBasis
  minQuantity?: number | null
  maxQuantity?: number | null
  sortOrder?: number
  category?: string | null
}

export type EnsureSuggestedServicesResult = {
  insertedCount: number
  skippedCount: number
  conflicts: { name: string; existingIds: string[] }[]
}

export type ServiceStatusFilter = 'all' | 'active' | 'inactive'

export type AdminServiceFormValues = {
  name: string
  description: string
  price: string
  active: boolean
  /** Omitted stays private. Existing callers do not send this field. */
  bookable?: boolean
  chargeBasis?: AdminServiceChargeBasis
  minQuantity?: string
  maxQuantity?: string
  sortOrder?: string
  category?: string
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
  if (record.price === null) return null
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
    chargeBasis: parseServiceChargeBasis(record.chargeBasis),
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

export function formatManagedServicePrice(price: string | null) {
  return price ? formatMoneyAmount(price) : SERVICE_PRICE_UNSET_LABEL
}

export function canActivateManagedService(_service?: { price: string | null }) {
  return true
}

export function snapshotCatalogSelection(
  item: Pick<AdminServiceCatalogItem, 'id' | 'price'>,
  quantity: number,
): { ok: true; serviceId: string; quantity: number; unitPrice: string } | { ok: false; error: string } {
  const quantityError = validateServiceQuantity(quantity)
  if (quantityError) return { ok: false, error: quantityError }
  if (!item.price) return { ok: false, error: SERVICE_PRICE_UNSET_LABEL }
  return { ok: true, serviceId: item.id, quantity, unitPrice: item.price }
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
  const price = parseManagedServicePrice(record.price)
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
    bookable: parseServiceBookable(record.bookable),
    chargeBasis: parseServiceChargeBasis(record.chargeBasis),
    minQuantity: parseServiceQuantityLimit(record.minQuantity),
    maxQuantity: parseServiceQuantityLimit(record.maxQuantity),
    sortOrder: parseServiceSortOrder(record.sortOrder),
    category: parseServiceCategory(record.category),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }
}

/** A missing flag stays private so older catalog rows are not exposed on the site. */
function parseServiceBookable(value: unknown): boolean {
  if (value === undefined) return false
  if (typeof value !== 'boolean') {
    throw new ApiError('Каталог послуг має некоректну публічну доступність.', 0, 'SERVICE_CATALOG_INVALID')
  }
  return value
}

function parseManagedServicePrice(value: unknown): string | null {
  if (value === null) return null
  if (typeof value !== 'string') {
    throw new ApiError('Каталог послуг має некоректну ціну.', 0, 'SERVICE_CATALOG_INVALID')
  }
  const price = normalizeMoneyString(value)
  if (!price) {
    throw new ApiError('Каталог послуг має некоректну ціну.', 0, 'SERVICE_CATALOG_INVALID')
  }
  return price
}

function parseServiceChargeBasis(value: unknown): AdminServiceChargeBasis {
  if (value === undefined) return 'PER_STAY'
  if (typeof value === 'string' && ADMIN_SERVICE_CHARGE_BASES.some((basis) => basis === value)) {
    return value as AdminServiceChargeBasis
  }
  throw new ApiError('Каталог послуг має непідтримуване нарахування.', 0, 'SERVICE_CATALOG_INVALID')
}

function parseServiceSortOrder(value: unknown): number {
  if (value === undefined) return 0
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > ADMIN_SERVICE_SORT_ORDER_MAX) {
    throw new ApiError('Каталог послуг має некоректний порядок.', 0, 'SERVICE_CATALOG_INVALID')
  }
  return value
}

function parseServiceCategory(value: unknown): string | null {
  if (value === undefined || value === null) return null
  if (typeof value !== 'string') {
    throw new ApiError('Каталог послуг має некоректну категорію.', 0, 'SERVICE_CATALOG_INVALID')
  }
  const category = value.trim()
  if (!category) return null
  if (category.length > ADMIN_SERVICE_CATEGORY_MAX) {
    throw new ApiError('Каталог послуг має некоректну категорію.', 0, 'SERVICE_CATALOG_INVALID')
  }
  return category
}

function parseServiceQuantityLimit(value: unknown): number | null {
  if (value === undefined || value === null) return null
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > ADMIN_SERVICE_QUANTITY_MAX) {
    throw new ApiError('Каталог послуг має некоректну кількість.', 0, 'SERVICE_CATALOG_INVALID')
  }
  return value
}

/** Public checkout lists a service only when it is active, priced, bookable, and charged once per stay. */
export function isPubliclyBookableService(service: {
  active: boolean
  bookable: boolean
  chargeBasis?: AdminServiceChargeBasis
  price?: string | null
}) {
  return (
    service.active &&
    service.bookable &&
    (service.chargeBasis ?? 'PER_STAY') === 'PER_STAY' &&
    Boolean(service.price)
  )
}

export function parseOptionalServiceQuantity(
  value: string | undefined,
): { ok: true; quantity: number | null } | { ok: false; error: string } {
  const trimmed = value?.trim() ?? ''
  if (!trimmed) return { ok: true, quantity: null }
  if (!/^\d+$/.test(trimmed)) {
    return { ok: false, error: 'Кількість має бути цілим числом від 1 до 99.' }
  }
  const quantity = Number(trimmed)
  if (quantity < 1 || quantity > ADMIN_SERVICE_QUANTITY_MAX) {
    return { ok: false, error: 'Кількість має бути цілим числом від 1 до 99.' }
  }
  return { ok: true, quantity }
}

export function validateServiceQuantityBounds(minQuantity: number | null, maxQuantity: number | null): string | null {
  if (minQuantity !== null && maxQuantity !== null && minQuantity > maxQuantity) {
    return 'Максимальна кількість має бути не меншою за мінімальну.'
  }
  return null
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

/** Empty/null price is unset, not free. */
export function validateOptionalServicePrice(
  value: unknown,
): { ok: true; price: string | null } | { ok: false; error: string } {
  if (value === null || value === undefined) return { ok: true, price: null }
  if (typeof value !== 'string') return { ok: false, error: 'Ціна має бути десятковим рядком.' }
  if (value.trim() === '') return { ok: true, price: null }
  const price = validateServicePrice(value)
  if (!price.ok) return price
  return { ok: true, price: price.price }
}

export function parseOptionalServiceSortOrder(
  value: string | undefined,
): { ok: true; sortOrder: number } | { ok: false; error: string } {
  const trimmed = value?.trim() ?? ''
  if (!trimmed) return { ok: true, sortOrder: 0 }
  if (!/^\d+$/.test(trimmed)) return { ok: false, error: 'Порядок має бути цілим числом від 0.' }
  const sortOrder = Number(trimmed)
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > ADMIN_SERVICE_SORT_ORDER_MAX) {
    return { ok: false, error: `Порядок має бути від 0 до ${ADMIN_SERVICE_SORT_ORDER_MAX}.` }
  }
  return { ok: true, sortOrder }
}

export function parseOptionalServiceCategory(
  value: string | undefined,
): { ok: true; category: string | null } | { ok: false; error: string } {
  const category = value?.trim() ?? ''
  if (!category) return { ok: true, category: null }
  if (category.length > ADMIN_SERVICE_CATEGORY_MAX) {
    return { ok: false, error: `Категорія має бути до ${ADMIN_SERVICE_CATEGORY_MAX} символів.` }
  }
  return { ok: true, category }
}

export function parseEnsureSuggestedServicesResult(raw: unknown): EnsureSuggestedServicesResult {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new ApiError('Некоректна відповідь шаблонних послуг.', 0, 'SERVICE_CATALOG_INVALID')
  }
  const record = raw as Record<string, unknown>
  if (typeof record.insertedCount !== 'number' || !Number.isInteger(record.insertedCount) || record.insertedCount < 0) {
    throw new ApiError('Некоректна відповідь шаблонних послуг.', 0, 'SERVICE_CATALOG_INVALID')
  }
  if (typeof record.skippedCount !== 'number' || !Number.isInteger(record.skippedCount) || record.skippedCount < 0) {
    throw new ApiError('Некоректна відповідь шаблонних послуг.', 0, 'SERVICE_CATALOG_INVALID')
  }
  const conflicts = Array.isArray(record.conflicts)
    ? record.conflicts.flatMap((entry) => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return []
        const row = entry as { name?: unknown; existingIds?: unknown }
        if (typeof row.name !== 'string' || !Array.isArray(row.existingIds)) return []
        return [{ name: row.name, existingIds: row.existingIds.filter((id): id is string => typeof id === 'string') }]
      })
    : []
  return { insertedCount: record.insertedCount, skippedCount: record.skippedCount, conflicts }
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
  const price = validateOptionalServicePrice(input.price)
  if (!price.ok) return { ok: false, error: price.error, field: 'price' }
  const bookable = input.bookable ?? false
  if (bookable && price.price === null) {
    return { ok: false, error: SERVICE_PUBLIC_NEEDS_PRICE, field: 'price' }
  }
  const chargeBasis = input.chargeBasis ?? 'PER_STAY'
  if (!ADMIN_SERVICE_CHARGE_BASES.includes(chargeBasis)) {
    return { ok: false, error: 'Каталог послуг має непідтримуване нарахування.', field: 'chargeBasis' }
  }
  const minQuantity = parseOptionalServiceQuantity(input.minQuantity)
  if (!minQuantity.ok) return { ok: false, error: minQuantity.error, field: 'minQuantity' }
  const maxQuantity = parseOptionalServiceQuantity(input.maxQuantity)
  if (!maxQuantity.ok) return { ok: false, error: maxQuantity.error, field: 'maxQuantity' }
  const bounds = validateServiceQuantityBounds(minQuantity.quantity, maxQuantity.quantity)
  if (bounds) return { ok: false, error: bounds, field: 'maxQuantity' }
  const sortOrder = parseOptionalServiceSortOrder(input.sortOrder)
  if (!sortOrder.ok) return { ok: false, error: sortOrder.error, field: 'sortOrder' }
  const category = parseOptionalServiceCategory(input.category)
  if (!category.ok) return { ok: false, error: category.error, field: 'category' }
  const body: AdminServiceCreateInput = {
    name: input.name.trim(),
    description: cleanServiceDescription(input.description),
    price: price.price,
    active: input.active,
    bookable,
    chargeBasis,
  }
  if (minQuantity.quantity !== null) body.minQuantity = minQuantity.quantity
  if (maxQuantity.quantity !== null) body.maxQuantity = maxQuantity.quantity
  if (sortOrder.sortOrder !== 0) body.sortOrder = sortOrder.sortOrder
  if (category.category !== null) body.category = category.category
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
  const price = validateOptionalServicePrice(input.price)
  if (!price.ok) return { ok: false, error: price.error, field: 'price' }
  const bookable = input.bookable ?? false
  const nextPrice = price.price
  if (bookable && nextPrice === null) {
    return { ok: false, error: SERVICE_PUBLIC_NEEDS_PRICE, field: 'price' }
  }
  const chargeBasis = input.chargeBasis ?? current.chargeBasis
  if (!ADMIN_SERVICE_CHARGE_BASES.includes(chargeBasis)) {
    return { ok: false, error: 'Каталог послуг має непідтримуване нарахування.', field: 'chargeBasis' }
  }
  const minQuantity = parseOptionalServiceQuantity(input.minQuantity)
  if (!minQuantity.ok) return { ok: false, error: minQuantity.error, field: 'minQuantity' }
  const maxQuantity = parseOptionalServiceQuantity(input.maxQuantity)
  if (!maxQuantity.ok) return { ok: false, error: maxQuantity.error, field: 'maxQuantity' }
  const bounds = validateServiceQuantityBounds(minQuantity.quantity, maxQuantity.quantity)
  if (bounds) return { ok: false, error: bounds, field: 'maxQuantity' }
  const sortOrder = parseOptionalServiceSortOrder(input.sortOrder)
  if (!sortOrder.ok) return { ok: false, error: sortOrder.error, field: 'sortOrder' }
  const category = parseOptionalServiceCategory(input.category)
  if (!category.ok) return { ok: false, error: category.error, field: 'category' }
  const description = cleanServiceDescription(input.description)
  const body: AdminServicePatchInput = {}
  if (input.name.trim() !== current.name) body.name = input.name.trim()
  if (description !== current.description) body.description = description
  if (nextPrice !== current.price) body.price = nextPrice
  if (input.active !== current.active) body.active = input.active
  if (bookable !== current.bookable) body.bookable = bookable
  if (chargeBasis !== current.chargeBasis) body.chargeBasis = chargeBasis
  if (minQuantity.quantity !== current.minQuantity) body.minQuantity = minQuantity.quantity
  if (maxQuantity.quantity !== current.maxQuantity) body.maxQuantity = maxQuantity.quantity
  if (sortOrder.sortOrder !== current.sortOrder) body.sortOrder = sortOrder.sortOrder
  if (category.category !== current.category) body.category = category.category
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
