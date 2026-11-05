import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createAdminGuest,
  downloadAdminGuests,
  getAdminGuest,
  listAdminGuestBookings,
  listAdminGuests,
  updateAdminGuest,
} from '@/api/guests'
import type { GuestDirectoryQuery, GuestHistoryQuery, GuestWriteInput } from '@/lib/admin-guests'
import { OPERATIONAL_STALE_TIME } from '@/lib/queryClient'

export function useGuestList(query: GuestDirectoryQuery) {
  return useQuery({
    queryKey: ['admin-guests', query],
    queryFn: ({ signal }) => listAdminGuests(query, signal),
    staleTime: OPERATIONAL_STALE_TIME,
  })
}

export function useGuestProfile(id: string) {
  return useQuery({
    queryKey: ['admin-guest', id],
    queryFn: ({ signal }) => getAdminGuest(id, signal),
    enabled: Boolean(id),
    staleTime: OPERATIONAL_STALE_TIME,
  })
}

export function useGuestHistory(id: string, query: GuestHistoryQuery, enabled: boolean) {
  return useQuery({
    queryKey: ['admin-guest-bookings', id, query],
    queryFn: ({ signal }) => listAdminGuestBookings(id, query, signal),
    enabled: enabled && Boolean(id),
    staleTime: OPERATIONAL_STALE_TIME,
  })
}

export function useSaveGuest() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: GuestWriteInput & { id?: string }) =>
      input.id ? updateAdminGuest(input.id, input) : createAdminGuest(input),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['admin-guests'] })
      await client.invalidateQueries({ queryKey: ['admin-guest'] })
    },
  })
}

export function useExportGuests() {
  return useMutation({
    mutationFn: (input: { query: GuestDirectoryQuery; format: 'csv' | 'xlsx' }) =>
      downloadAdminGuests(input.query, input.format),
  })
}
