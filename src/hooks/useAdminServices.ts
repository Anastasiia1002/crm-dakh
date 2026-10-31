import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createAdminService,
  getAdminService,
  listAdminServices,
  listManagedAdminServices,
  updateAdminService,
} from '@/api/admin-services'
import type { AdminServiceCreateInput, AdminServicePatchInput } from '@/lib/admin-services'
import { CATALOG_STALE_TIME } from '@/lib/queryClient'

export const adminServicesQueryKey = ['admin-services'] as const
export const adminManagedServicesQueryKey = ['admin-managed-services'] as const

export const adminServiceMutationInvalidateKeys = [adminServicesQueryKey, adminManagedServicesQueryKey] as const

export function useAdminServices(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: adminServicesQueryKey,
    queryFn: ({ signal }) => listAdminServices(signal),
    enabled: options?.enabled ?? true,
    staleTime: CATALOG_STALE_TIME,
  })
}

export function useManagedAdminServices() {
  return useQuery({
    queryKey: adminManagedServicesQueryKey,
    queryFn: ({ signal }) => listManagedAdminServices(signal),
    staleTime: CATALOG_STALE_TIME,
  })
}

export function useAdminService(id: string | undefined) {
  return useQuery({
    queryKey: [...adminManagedServicesQueryKey, id],
    queryFn: ({ signal }) => getAdminService(id!, signal),
    enabled: Boolean(id),
    staleTime: CATALOG_STALE_TIME,
  })
}

function useInvalidateAdminServiceCatalogs() {
  const queryClient = useQueryClient()
  return () => {
    for (const queryKey of adminServiceMutationInvalidateKeys) {
      void queryClient.invalidateQueries({ queryKey })
    }
  }
}

export function useCreateAdminService() {
  const invalidate = useInvalidateAdminServiceCatalogs()
  return useMutation({
    mutationFn: (input: AdminServiceCreateInput) => createAdminService(input),
    onSuccess: invalidate,
  })
}

export function useUpdateAdminService() {
  const invalidate = useInvalidateAdminServiceCatalogs()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AdminServicePatchInput }) => updateAdminService(id, input),
    onSuccess: invalidate,
  })
}
