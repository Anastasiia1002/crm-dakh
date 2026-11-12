import { apiBlob, apiRequest } from '@/lib/api-client'
import { parseAuditPage, type AuditListQuery, type AuditPage } from '@/lib/admin-audit'

function auditSearch(query: AuditListQuery) {
  const search = new URLSearchParams()
  if (query.dateFrom) search.set('dateFrom', query.dateFrom)
  if (query.dateTo) search.set('dateTo', query.dateTo)
  if (query.actorId) search.set('actorId', query.actorId)
  if (query.action) search.set('action', query.action)
  if (query.entityType) search.set('entityType', query.entityType)
  if (query.entityId) search.set('entityId', query.entityId)
  if (query.category) search.set('category', query.category)
  if (query.page !== undefined) search.set('page', String(query.page))
  if (query.pageSize !== undefined) search.set('pageSize', String(query.pageSize))
  const suffix = search.toString()
  return suffix ? `?${suffix}` : ''
}

export async function listAuditEvents(query: AuditListQuery, signal?: AbortSignal): Promise<AuditPage> {
  const raw = await apiRequest<unknown>(`/api/admin/audit${auditSearch(query)}`, { signal })
  return parseAuditPage(raw)
}

export async function exportAuditEvents(query: Omit<AuditListQuery, 'page' | 'pageSize'>): Promise<Blob> {
  return apiBlob(`/api/admin/audit/export${auditSearch(query)}`, 'text/csv')
}
