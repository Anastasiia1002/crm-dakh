import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  commitAdminGuestImport,
  createAdminGuest,
  downloadAdminGuests,
  getAdminGuest,
  listAdminGuestBookings,
  listAdminGuests,
  previewAdminGuestImport,
  updateAdminGuest,
} from '@/api/guests'
import type { GuestDirectoryQuery, GuestHistoryQuery, GuestWriteInput } from '@/lib/admin-guests'
import type { GuestImportDuplicateMode, GuestImportMapping } from '@/lib/guest-import'
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

export function usePreviewGuestImport() {
  return useMutation({
    mutationFn: (file: File) => previewAdminGuestImport(file),
  })
}

export function useCommitGuestImport() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: { file: File; mapping: GuestImportMapping; duplicateMode: GuestImportDuplicateMode }) =>
      commitAdminGuestImport(input),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['admin-guests'] })
      await client.invalidateQueries({ queryKey: ['admin-guest'] })
    },
  })
}
