import { apiRequest } from '@/lib/api-client'
import {
  guestDirectoryPath,
  guestHistoryPath,
  guestProfilePath,
  parseGuestDirectoryPage,
  parseGuestHistoryPage,
  parseGuestProfile,
  type AdminGuestHistoryPage,
  type AdminGuestListPage,
  type AdminGuestProfile,
  type GuestDirectoryQuery,
  type GuestHistoryQuery,
} from '@/lib/admin-guests'

export async function listAdminGuests(query: GuestDirectoryQuery, signal?: AbortSignal): Promise<AdminGuestListPage> {
  const body = await apiRequest<unknown>(guestDirectoryPath(query), { signal })
  return parseGuestDirectoryPage(body)
}

export async function getAdminGuest(id: string, signal?: AbortSignal): Promise<AdminGuestProfile> {
  const body = await apiRequest<unknown>(guestProfilePath(id), { signal })
  return parseGuestProfile(body)
}

export async function listAdminGuestBookings(
  id: string,
  query: GuestHistoryQuery,
  signal?: AbortSignal,
): Promise<AdminGuestHistoryPage> {
  const body = await apiRequest<unknown>(guestHistoryPath(id, query), { signal })
  return parseGuestHistoryPage(body)
}
