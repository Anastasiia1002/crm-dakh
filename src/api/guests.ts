import { apiBlob, apiRequest } from '@/lib/api-client'
import {
  guestCreatePath,
  guestDirectoryPath,
  guestDuplicateCheckPath,
  guestExportPath,
  guestHistoryPath,
  guestProfilePath,
  guestUpdatePath,
  parseGuestDirectoryPage,
  parseGuestHistoryPage,
  parseGuestProfile,
  type AdminGuestHistoryPage,
  type AdminGuestListPage,
  type AdminGuestProfile,
  type GuestDirectoryQuery,
  type GuestHistoryQuery,
  type GuestWriteInput,
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

export async function createAdminGuest(input: GuestWriteInput): Promise<AdminGuestProfile> {
  const body = await apiRequest<unknown>(guestCreatePath(), { method: 'POST', body: input })
  return parseGuestProfile(body)
}

export async function updateAdminGuest(id: string, input: GuestWriteInput): Promise<AdminGuestProfile> {
  const body = await apiRequest<unknown>(guestUpdatePath(id), { method: 'PATCH', body: input })
  return parseGuestProfile(body)
}

export async function checkAdminGuestDuplicate(input: GuestWriteInput): Promise<{ kind: string }> {
  return apiRequest(guestDuplicateCheckPath(), { method: 'POST', body: input })
}

export async function downloadAdminGuests(query: GuestDirectoryQuery, format: 'csv' | 'xlsx'): Promise<void> {
  const blob = await apiBlob(guestExportPath(query, format), format === 'csv' ? 'text/csv' : 'application/vnd.ms-excel')
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = format === 'csv' ? 'kliienty.csv' : 'kliienty.xls'
  link.click()
  URL.revokeObjectURL(url)
}
