import { apiRequest } from '@/lib/api-client'
import { ApiError } from '@/lib/api-error'
import type { AdminBookingListItem, AdminBookingListQuery, AdminBookingPage } from '@/types'

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

export async function getAdminBooking(id: string, signal?: AbortSignal): Promise<AdminBookingListItem> {
  return apiRequest(`/api/admin/bookings/${id}`, { signal })
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
