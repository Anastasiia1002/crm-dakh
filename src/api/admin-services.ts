import { apiRequest } from '@/lib/api-client'
import {
  parseAdminServiceCatalog,
  parseEnsureSuggestedServicesResult,
  parseManagedAdminService,
  parseManagedAdminServiceCatalog,
  type AdminManagedService,
  type AdminServiceCatalogItem,
  type AdminServiceCreateInput,
  type AdminServicePatchInput,
  type EnsureSuggestedServicesResult,
} from '@/lib/admin-services'

export async function listAdminServices(signal?: AbortSignal): Promise<AdminServiceCatalogItem[]> {
  const raw = await apiRequest<unknown>('/api/admin/services', { signal })
  return parseAdminServiceCatalog(raw)
}

export async function listManagedAdminServices(signal?: AbortSignal): Promise<AdminManagedService[]> {
  const raw = await apiRequest<unknown>('/api/admin/services?active=all', { signal })
  return parseManagedAdminServiceCatalog(raw)
}

export async function getAdminService(id: string, signal?: AbortSignal): Promise<AdminManagedService> {
  const raw = await apiRequest<unknown>(`/api/admin/services/${id}`, { signal })
  return parseManagedAdminService(raw)
}

export async function createAdminService(input: AdminServiceCreateInput): Promise<AdminManagedService> {
  const raw = await apiRequest<unknown>('/api/admin/services', { method: 'POST', body: input })
  return parseManagedAdminService(raw)
}

export async function updateAdminService(id: string, input: AdminServicePatchInput): Promise<AdminManagedService> {
  const raw = await apiRequest<unknown>(`/api/admin/services/${id}`, { method: 'PATCH', body: input })
  return parseManagedAdminService(raw)
}

export async function ensureSuggestedAdminServices(): Promise<EnsureSuggestedServicesResult> {
  const raw = await apiRequest<unknown>('/api/admin/services/ensure-suggested', { method: 'POST' })
  return parseEnsureSuggestedServicesResult(raw)
}
