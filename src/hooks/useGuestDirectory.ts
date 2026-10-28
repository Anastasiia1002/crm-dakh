import { useQuery } from '@tanstack/react-query'
import { getAdminGuest, listAdminGuestBookings, listAdminGuests } from '@/api/guests'
import type { GuestDirectoryQuery, GuestHistoryQuery } from '@/lib/admin-guests'
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
