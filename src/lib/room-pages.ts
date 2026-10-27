export type RoomPage<T> = {
  items: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export class RoomPageError extends Error {
  readonly code: 'ROOMS_PAGE_INCOMPLETE' | 'ROOMS_WINDOW_TOO_LARGE'

  constructor(message: string, code: 'ROOMS_PAGE_INCOMPLETE' | 'ROOMS_WINDOW_TOO_LARGE') {
    super(message)
    this.name = 'RoomPageError'
    this.code = code
  }
}

/**
 * Walk every page of a room list. Duplicate ids are kept once.
 * A short or repeated page is an error, not a complete catalog.
 */
export async function collectPagedRooms<T extends { id: string }>(
  loadPage: (page: number, limit: number) => Promise<RoomPage<T>>,
  options?: { limit?: number; maxPages?: number },
): Promise<T[]> {
  const limit = options?.limit ?? 100
  const maxPages = options?.maxPages ?? 200
  const byId = new Map<string, T>()
  let page = 1
  let totalPages = 1
  let total: number | null = null

  while (page <= totalPages) {
    if (page > maxPages) {
      throw new RoomPageError('Занадто багато розміщень, щоб завантажити повний список.', 'ROOMS_WINDOW_TOO_LARGE')
    }
    const result = await loadPage(page, limit)
    const reported = result.pagination
    if (reported.page !== page || reported.limit !== limit) {
      throw new RoomPageError('Список розміщень завантажено не повністю.', 'ROOMS_PAGE_INCOMPLETE')
    }
    if (total === null) {
      total = reported.total
      totalPages = reported.totalPages
    } else if (reported.total !== total || reported.totalPages !== totalPages) {
      throw new RoomPageError('Список розміщень завантажено не повністю.', 'ROOMS_PAGE_INCOMPLETE')
    }
    if (result.items.length === 0 && page < totalPages) {
      throw new RoomPageError('Список розміщень завантажено не повністю.', 'ROOMS_PAGE_INCOMPLETE')
    }
    for (const item of result.items) {
      if (!item.id || byId.has(item.id)) continue
      byId.set(item.id, item)
    }
    if (totalPages === 0 || page >= totalPages) break
    page += 1
  }

  if (total === null || byId.size !== total) {
    throw new RoomPageError('Список розміщень завантажено не повністю.', 'ROOMS_PAGE_INCOMPLETE')
  }
  return [...byId.values()]
}
