import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getGuestProfile, importGuestFile, listGuests, listGuestsForExport, saveGuest } from '@/api/guests'
import type { GuestFilters, GuestWriteInput } from '@/types'

export function useGuestList(filters: GuestFilters) {
  return useQuery({
    queryKey: ['guest-directory', filters],
    queryFn: () => listGuests(filters),
  })
}

export function useGuestProfile(id: string) {
  return useQuery({
    queryKey: ['guest-profile', id],
    queryFn: () => getGuestProfile(id),
    enabled: Boolean(id),
  })
}

function useRefreshGuests() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['guest-directory'] })
    void queryClient.invalidateQueries({ queryKey: ['guest-profile'] })
    void queryClient.invalidateQueries({ queryKey: ['guests'] })
    void queryClient.invalidateQueries({ queryKey: ['audit'] })
  }
}

export function useSaveGuest() {
  const refresh = useRefreshGuests()
  return useMutation({
    mutationFn: (input: GuestWriteInput) => saveGuest(input),
    onSuccess: refresh,
  })
}

export function useImportGuests() {
  const refresh = useRefreshGuests()
  return useMutation({
    mutationFn: importGuestFile,
    onSuccess: refresh,
  })
}

export function useGuestExport() {
  return useMutation({
    mutationFn: (filters: GuestFilters) => listGuestsForExport(filters),
  })
}
