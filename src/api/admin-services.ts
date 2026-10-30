import { apiRequest } from '@/lib/api-client'
import { parseAdminServiceCatalog, type AdminServiceCatalogItem } from '@/lib/admin-services'

export async function listAdminServices(signal?: AbortSignal): Promise<AdminServiceCatalogItem[]> {
  const raw = await apiRequest<unknown>('/api/admin/services', { signal })
  return parseAdminServiceCatalog(raw)
}
