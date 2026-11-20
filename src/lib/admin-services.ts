import { ApiError } from '@/lib/api-error'
import { formatMoneyAmount, normalizeMoneyString } from '@/lib/format'
import { textIncludesSearch } from '@/lib/text-search'

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
  'Порожня ціна не означає безкоштовно. Для платного способу розрахунку на сайті потрібна ціна; заявку з оплатою за домовленістю задають окремо.'
export const SERVICE_ONLINE_TOGGLE_HINT =
  'Незалежно від «Активна». Гість бачить послугу лише коли обидва перемикачі увімкнені.'
export const SERVICE_PUBLIC_STAY_ONLY_HINT =
  'На сайті гість бачить кожну активну послугу з увімкненим онлайн і обраним способом розрахунку. Нарахування в CRM на суму на сайті не впливає.'
export const SERVICE_PER_NIGHT_PENDING_HINT =
  'Ціна множиться на ночі проживання (виїзд не враховується).'
export const SERVICE_UNSUPPORTED_PUBLIC_BASIS_HINT =
  'Порожня ціна ніколи не показується як 0 ₴. Заявку з оплатою за домовленістю задають окремим способом розрахунку на сайті.'
export const SERVICE_SAVED_ONLINE_FLAG_HINT =
  'Онлайн увімкнено. Вимкнена послуга на сайті все одно не з’являється.'
export const SERVICE_AGREED_PRICE_LABEL = 'Оплата за домовленістю'
export const SERVICE_SITE_BADGE = 'Доступна на сайті'
export const SERVICE_CRM_BADGE = 'Лише в CRM'
export const SERVICE_ONLINE_UNAVAILABLE_BADGE = 'Онлайн недоступна'
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
/** Every saved CRM unit can be shown online. Pricing math is separate from this list. */
export const PUBLIC_SERVICE_CHARGE_BASES: readonly AdminServiceChargeBasis[] = ADMIN_SERVICE_CHARGE_BASES
export const LIVE_PUBLIC_SERVICE_CHARGE_BASES: readonly AdminServiceChargeBasis[] = ADMIN_SERVICE_CHARGE_BASES

export const ONLINE_PRICING_MODES = ['FIXED_ONCE', 'GUEST_QUANTITY', 'PER_NIGHT', 'REQUEST_ONLY', 'FREE'] as const
export type OnlinePricingMode = (typeof ONLINE_PRICING_MODES)[number]

export const SERVICE_ONLINE_PRICING_LABEL: Record<OnlinePricingMode, string> = {
  FIXED_ONCE: 'Фіксована ціна один раз',
  GUEST_QUANTITY: 'Кількість × ціна',
  PER_NIGHT: 'Ціна × ночі проживання',
  REQUEST_ONLY: 'Оплата за домовленістю',
  FREE: 'Безкоштовно',
}

export const SERVICE_ONLINE_PRICING_HELP: Record<OnlinePricingMode, string> = {
  FIXED_ONCE: 'Гість додає послугу один раз. Кількість не вводить; сума дорівнює зазначеній ціні.',
  GUEST_QUANTITY: 'Гість вводить кількість. Сума = кількість × ціна. Ночі й гості не множаться автоматично.',
  PER_NIGHT: 'Сума = ціна × ночі проживання. Виїзд не враховується. Кількість гість не змінює.',
  REQUEST_ONLY: 'Гість може додати заявку з оплатою за домовленістю. Ціна не обов’язкова; рядок не входить у грошовий підсумок.',
  FREE: 'Гість може додати послугу без ціни. На сайті вона показується як «Безкоштовно». У бронюванні зберігається 0 ₴ і сума проживання не зростає.',
}

export const SERVICE_ONLINE_PRICING_REQUIRED = 'Оберіть спосіб розрахунку на сайті.'
export const SERVICE_ONLINE_PRICED_NEEDS_PRICE =
  'Для цього способу розрахунку потрібна ціна. Порожня ціна не є безкоштовною і не стає заявкою сама.'

export function isOnlinePricingMode(value: unknown): value is OnlinePricingMode {
  return typeof value === 'string' && (ONLINE_PRICING_MODES as readonly string[]).includes(value)
}

export function requiresOnlineUnitPrice(mode: OnlinePricingMode) {
  return mode !== 'REQUEST_ONLY' && mode !== 'FREE'
}

export function onlineConfigurationError(input: {
  bookable: boolean
  onlinePricing: OnlinePricingMode | null
  price?: string | null
}) {
  if (!input.bookable) return null
  if (!input.onlinePricing) return SERVICE_ONLINE_PRICING_REQUIRED
  if (requiresOnlineUnitPrice(input.onlinePricing) && !input.price) return SERVICE_ONLINE_PRICED_NEEDS_PRICE
  return null
}

export function isPublicServiceChargeBasis(basis?: AdminServiceChargeBasis) {
  return PUBLIC_SERVICE_CHARGE_BASES.includes(basis ?? 'PER_STAY')
}

export function canEnablePublicOnlineBooking(_basis?: AdminServiceChargeBasis) {
  return true
}

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
  onlinePricing: OnlinePricingMode | null
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
  onlinePricing: OnlinePricingMode | null
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
  onlinePricing?: OnlinePricingMode | null
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
  onlinePricing?: OnlinePricingMode | null
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
    onlinePricing: parseServiceOnlinePricing(record.onlinePricing),
    minQuantity: parseServiceQuantityLimit(record.minQuantity),
    maxQuantity: parseServiceQuantityLimit(record.maxQuantity),
    sortOrder: parseServiceSortOrder(record.sortOrder),
    category: parseServiceCategory(record.category),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }
}

function parseServiceOnlinePricing(value: unknown): OnlinePricingMode | null {
  if (value === undefined || value === null) return null
  if (!isOnlinePricingMode(value)) {
    throw new ApiError('Каталог послуг має некоректний спосіб розрахунку на сайті.', 0, 'SERVICE_CATALOG_INVALID')
  }
  return value
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

/** Public checkout lists a service only when it is active and marked for online booking. */
export function isPubliclyBookableService(service: {
  active: boolean
  bookable: boolean
  chargeBasis?: AdminServiceChargeBasis
  onlinePricing?: OnlinePricingMode | null
  price?: string | null
}) {
  return (
    service.active &&
    service.bookable &&
    onlineConfigurationError({
      bookable: service.bookable,
      onlinePricing: service.onlinePricing ?? null,
      price: service.price,
    }) == null
  )
}

export function serviceSiteVisibilityLabel(service: {
  active: boolean
  bookable: boolean
  chargeBasis?: AdminServiceChargeBasis
  price?: string | null
}) {
  if (isPubliclyBookableService(service)) return SERVICE_SITE_BADGE
  if (!service.bookable) return SERVICE_CRM_BADGE
  return SERVICE_ONLINE_UNAVAILABLE_BADGE
}

export function serviceOnlineUnavailableReason(service: {
  active: boolean
  bookable: boolean
  chargeBasis?: AdminServiceChargeBasis
  onlinePricing?: OnlinePricingMode | null
  price?: string | null
}) {
  if (!service.bookable || isPubliclyBookableService(service)) return null
  if (!service.active) return 'Послуга вимкнена, тому на сайті її немає.'
  const config = onlineConfigurationError({
    bookable: service.bookable,
    onlinePricing: service.onlinePricing ?? null,
    price: service.price,
  })
  if (config) return config
  return 'На сайті зараз недоступна.'
}

export function serviceOnlineFieldHint(input: {
  bookable: boolean
  active: boolean
  chargeBasis: AdminServiceChargeBasis
  onlinePricing?: OnlinePricingMode | null
  price?: string | null
}) {
  if (input.bookable && !input.active) return SERVICE_SAVED_ONLINE_FLAG_HINT
  if (input.onlinePricing) {
    return `${SERVICE_ONLINE_TOGGLE_HINT} ${SERVICE_ONLINE_PRICING_HELP[input.onlinePricing]}`
  }
  return `${SERVICE_ONLINE_TOGGLE_HINT} Спосіб розрахунку на сайті задається окремо від нарахування в CRM і від назви послуги.`
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
  const chargeBasis = input.chargeBasis ?? 'PER_STAY'
  if (!ADMIN_SERVICE_CHARGE_BASES.includes(chargeBasis)) {
    return { ok: false, error: 'Каталог послуг має непідтримуване нарахування.', field: 'chargeBasis' }
  }
  const bookable = input.bookable ?? false
  const onlinePricing = input.onlinePricing ?? null
  const pricingError = onlineConfigurationError({ bookable, onlinePricing, price: price.price })
  if (pricingError) {
    return {
      ok: false,
      error: pricingError,
      field: onlinePricing && requiresOnlineUnitPrice(onlinePricing) ? 'price' : 'onlinePricing',
    }
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
    onlinePricing,
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
  const chargeBasis = input.chargeBasis ?? current.chargeBasis
  if (!ADMIN_SERVICE_CHARGE_BASES.includes(chargeBasis)) {
    return { ok: false, error: 'Каталог послуг має непідтримуване нарахування.', field: 'chargeBasis' }
  }
  const bookable = input.bookable ?? false
  const nextPrice = price.price
  const onlinePricing = input.onlinePricing === undefined ? current.onlinePricing : input.onlinePricing
  const pricingError = onlineConfigurationError({ bookable, onlinePricing, price: nextPrice })
  if (pricingError) {
    return {
      ok: false,
      error: pricingError,
      field: onlinePricing && requiresOnlineUnitPrice(onlinePricing) ? 'price' : 'onlinePricing',
    }
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
  if (onlinePricing !== current.onlinePricing) body.onlinePricing = onlinePricing
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
  return items.filter((item) => {
    if (options.status === 'active' && !item.active) return false
    if (options.status === 'inactive' && item.active) return false
    if (!textIncludesSearch(item.name, options.query)) return false
    return true
  })
}
