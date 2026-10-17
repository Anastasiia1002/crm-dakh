import { apiRequest } from '@/lib/api-client'
import { ApiError } from '@/lib/api-error'
import { sanitizeAdminBookingCreateBody, sanitizeAdminBookingQuoteBody } from '@/lib/admin-booking-view'
import type {
  AdminBookingCancelInput,
  AdminBookingCreateInput,
  AdminBookingDetail,
  AdminBookingGuestSelectionPage,
  AdminBookingListItem,
  AdminBookingListQuery,
  AdminBookingPage,
  AdminBookingQuote,
  AdminBookingQuoteInput,
  AdminBookingUpdateInput,
} from '@/types'

const PAGE_LIMIT = 100
/** Hard stop — above this, return an explicit incomplete-data error instead of truncating. */
const MAX_BOOKING_PAGES = 200

function querySuffix(params: Record<string, string | number | boolean | undefined>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue
    search.set(key, String(value))
  }
  const suffix = search.toString()
  return suffix ? `?${suffix}` : ''
}

export async function listAdminBookings(
  query: AdminBookingListQuery = {},
  signal?: AbortSignal,
): Promise<AdminBookingPage> {
  return apiRequest(
    `/api/admin/bookings${querySuffix({
      page: query.page,
      limit: query.limit,
      status: query.status,
      source: query.source,
      id: query.id,
      roomId: query.roomId,
      roomTypeId: query.roomTypeId,
      checkIn: query.checkIn,
      checkOut: query.checkOut,
      createdFrom: query.createdFrom,
      createdTo: query.createdTo,
      search: query.search?.trim() || undefined,
    })}`,
    { signal },
  )
}

export async function getAdminBooking(id: string, signal?: AbortSignal): Promise<AdminBookingDetail> {
  return apiRequest(`/api/admin/bookings/${id}`, { signal })
}

export async function listAdminBookingGuests(
  query: { page?: number; limit?: number; search?: string } = {},
  signal?: AbortSignal,
): Promise<AdminBookingGuestSelectionPage> {
  return apiRequest(
    `/api/admin/bookings/guests${querySuffix({
      page: query.page,
      limit: query.limit,
      search: query.search?.trim() || undefined,
    })}`,
    { signal },
  )
}

export async function quoteAdminBooking(
  input: AdminBookingQuoteInput,
  signal?: AbortSignal,
): Promise<AdminBookingQuote> {
  return apiRequest('/api/admin/bookings/quote', {
    method: 'POST',
    body: sanitizeAdminBookingQuoteBody(input),
    signal,
  })
}

export async function createAdminBooking(input: AdminBookingCreateInput): Promise<AdminBookingDetail> {
  return apiRequest('/api/admin/bookings', {
    method: 'POST',
    body: sanitizeAdminBookingCreateBody(input),
  })
}

export async function updateAdminBooking(
  id: string,
  input: AdminBookingUpdateInput,
): Promise<AdminBookingDetail> {
  return apiRequest(`/api/admin/bookings/${id}`, {
    method: 'PATCH',
    body: input,
  })
}

export async function confirmAdminBooking(id: string): Promise<AdminBookingDetail> {
  return apiRequest(`/api/admin/bookings/${id}/confirm`, { method: 'POST' })
}

export async function checkInAdminBooking(id: string): Promise<AdminBookingDetail> {
  return apiRequest(`/api/admin/bookings/${id}/check-in`, { method: 'POST' })
}

export async function checkOutAdminBooking(id: string): Promise<AdminBookingDetail> {
  return apiRequest(`/api/admin/bookings/${id}/check-out`, { method: 'POST' })
}

export async function noShowAdminBooking(id: string): Promise<AdminBookingDetail> {
  return apiRequest(`/api/admin/bookings/${id}/no-show`, { method: 'POST' })
}

export async function cancelAdminBooking(
  id: string,
  input: AdminBookingCancelInput = {},
): Promise<AdminBookingDetail> {
  return apiRequest(`/api/admin/bookings/${id}/cancel`, {
    method: 'POST',
    body: input,
  })
}

/**
 * Fetch every booking overlapping [windowStart, windowEnd) using backend overlap filters.
 * Deduplicates by id. Throws on page failure or if the safety page cap would truncate results.
 */
export async function listAllOverlappingBookings(
  windowStart: string,
  windowEnd: string,
  signal?: AbortSignal,
): Promise<AdminBookingListItem[]> {
  const byId = new Map<string, AdminBookingListItem>()
  let page = 1
  let totalPages = 0
  let total = 0

  while (true) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

    const result = await listAdminBookings(
      {
        page,
        limit: PAGE_LIMIT,
        checkIn: windowStart,
        checkOut: windowEnd,
      },
      signal,
    )

    total = result.pagination.total
    totalPages = result.pagination.totalPages

    if (totalPages > MAX_BOOKING_PAGES) {
      throw new ApiError(
        `У вибраному періоді занадто багато бронювань (${total}). Звузьте вікно календаря.`,
        0,
        'BOOKINGS_WINDOW_TOO_LARGE',
        [`pages=${totalPages}`, `maxPages=${MAX_BOOKING_PAGES}`],
      )
    }

    for (const item of result.items) {
      byId.set(item.id, item)
    }

    if (totalPages === 0 || result.items.length === 0) break
    if (page >= totalPages) break

    page += 1
    if (page > MAX_BOOKING_PAGES) {
      throw new ApiError(
        'Завантаження бронювань перевищило безпечний ліміт сторінок. Звузьте вікно календаря.',
        0,
        'BOOKINGS_WINDOW_TOO_LARGE',
      )
    }
  }

  if (total > 0 && byId.size < total) {
    throw new ApiError(
      'Список бронювань завантажено неповністю. Зайнятість номерів збережено з календаря доступності.',
      0,
      'BOOKINGS_INCOMPLETE',
      [`loaded=${byId.size}`, `total=${total}`],
    )
  }

  return [...byId.values()]
}
