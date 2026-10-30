import { useQuery } from '@tanstack/react-query'
import { listAdminServices } from '@/api/admin-services'
import { CATALOG_STALE_TIME } from '@/lib/queryClient'

export const adminServicesQueryKey = ['admin-services'] as const

export function useAdminServices(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: adminServicesQueryKey,
    queryFn: ({ signal }) => listAdminServices(signal),
    enabled: options?.enabled ?? true,
    staleTime: CATALOG_STALE_TIME,
  })
}
