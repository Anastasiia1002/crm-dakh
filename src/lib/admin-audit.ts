import { ApiError } from '@/lib/api-error'
import type { UserRole } from '@/types'
import { mapBackendRole } from '@/lib/roles'

export const AUDIT_CATEGORIES = [
  'auth',
  'staff',
  'booking',
  'guest',
  'accommodation',
  'pricing',
  'promo',
  'service',
  'settings',
  'other',
] as const

export type AuditCategory = (typeof AUDIT_CATEGORIES)[number]

export const auditCategoryLabel: Record<AuditCategory, string> = {
  auth: 'Автентифікація',
  staff: 'Персонал',
  booking: 'Бронювання',
  guest: 'Гості',
  accommodation: 'Розміщення',
  pricing: 'Тарифи',
  promo: 'Промокоди',
  service: 'Послуги',
  settings: 'Налаштування',
  other: 'Інше',
}

export const operationalAuditCategories: AuditCategory[] = [
  'booking',
  'guest',
  'accommodation',
  'promo',
  'service',
  'settings',
  'other',
]

export type AuditActor = {
  id: string
  displayName: string
  role: UserRole | null
  active: boolean | null
}

export type AuditEvent = {
  id: string
  createdAt: string
  actor: AuditActor | null
  action: string
  category: AuditCategory
  entityType: string
  entityLabel: string
  entityId: string | null
  description: string
  details: Record<string, unknown> | null
  outcome: 'success' | 'failure'
}

export type AuditPage = {
  items: AuditEvent[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export type AuditListQuery = {
  dateFrom?: string
  dateTo?: string
  actorId?: string
  action?: string
  entityType?: string
  entityId?: string
  category?: AuditCategory
  page?: number
  pageSize?: number
}

export function isAuditUnavailable(error: unknown) {
  return error instanceof ApiError && error.status === 404
}

export function entityHref(entityType: string, entityId: string | null): string | null {
  if (!entityId) return null
  if (entityType === 'Booking') return `/admin/bookings/${entityId}`
  if (entityType === 'Guest') return `/admin/guests/${entityId}`
  return null
}

export function parseAuditPage(raw: unknown): AuditPage {
  if (!raw || typeof raw !== 'object') {
    throw new ApiError('Некоректна відповідь журналу дій', 0, 'AUDIT_INVALID')
  }
  const body = raw as {
    items?: unknown
    pagination?: {
      page?: unknown
      pageSize?: unknown
      total?: unknown
      totalPages?: unknown
    }
  }
  if (!Array.isArray(body.items) || !body.pagination || typeof body.pagination !== 'object') {
    throw new ApiError('Некоректна відповідь журналу дій', 0, 'AUDIT_INVALID')
  }
  return {
    items: body.items.map(parseAuditEvent),
    pagination: {
      page: numberOr(body.pagination.page, 1),
      pageSize: numberOr(body.pagination.pageSize, 20),
      total: numberOr(body.pagination.total, 0),
      totalPages: numberOr(body.pagination.totalPages, 0),
    },
  }
}

function parseAuditEvent(raw: unknown): AuditEvent {
  if (!raw || typeof raw !== 'object') {
    throw new ApiError('Некоректний запис журналу дій', 0, 'AUDIT_INVALID')
  }
  const row = raw as Record<string, unknown>
  if (typeof row.id !== 'string' || typeof row.createdAt !== 'string' || typeof row.action !== 'string') {
    throw new ApiError('Некоректний запис журналу дій', 0, 'AUDIT_INVALID')
  }
  const category = AUDIT_CATEGORIES.includes(row.category as AuditCategory) ? (row.category as AuditCategory) : 'other'
  return {
    id: row.id,
    createdAt: row.createdAt,
    actor: parseActor(row.actor),
    action: row.action,
    category,
    entityType: typeof row.entityType === 'string' ? row.entityType : '',
    entityLabel: typeof row.entityLabel === 'string' ? row.entityLabel : '',
    entityId: typeof row.entityId === 'string' ? row.entityId : null,
    description: typeof row.description === 'string' ? row.description : row.action,
    details: row.details && typeof row.details === 'object' && !Array.isArray(row.details) ? (row.details as Record<string, unknown>) : null,
    outcome: row.outcome === 'failure' ? 'failure' : 'success',
  }
}

function parseActor(raw: unknown): AuditActor | null {
  if (!raw || typeof raw !== 'object') return null
  const actor = raw as Record<string, unknown>
  if (typeof actor.id !== 'string' || typeof actor.displayName !== 'string') return null
  let role: UserRole | null = null
  if (typeof actor.role === 'string') {
    try {
      role = mapBackendRole(actor.role)
    } catch {
      role = null
    }
  }
  return {
    id: actor.id,
    displayName: actor.displayName,
    role,
    active: typeof actor.active === 'boolean' ? actor.active : null,
  }
}

function numberOr(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}
