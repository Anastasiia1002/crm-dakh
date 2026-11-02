import { ApiError } from '@/lib/api-error'
import { blockConflictMessage } from '@/lib/room-block'
import { errorMessage } from '@/lib/errors'
import type { RoomTypeImage } from '@/types'

export const ACCOMMODATION_IMAGE_MAX_BYTES = 8 * 1024 * 1024

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export const ACCOMMODATION_UPLOAD_UNAVAILABLE =
  'Файл перевірено, але сховище фото ще не підключене. Зображення не збережено. Додайте фото за https-посиланням.'

export type AccommodationImageRejection = 'empty' | 'type' | 'size'

export function validateAccommodationImageFile(file: {
  type: string
  size: number
}): { ok: true } | { ok: false; reason: AccommodationImageRejection } {
  if (file.size <= 0) return { ok: false, reason: 'empty' }
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) return { ok: false, reason: 'type' }
  if (file.size > ACCOMMODATION_IMAGE_MAX_BYTES) return { ok: false, reason: 'size' }
  return { ok: true }
}

export function accommodationImageRejection(reason: AccommodationImageRejection, name: string): string {
  const label = name.trim() || 'Файл'
  if (reason === 'empty') return `${label}: файл порожній`
  if (reason === 'size') return `${label}: файл більший за 8 МБ`
  return `${label}: дозволені лише JPG, PNG і WebP`
}

export function isSafeAccommodationImageUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function sortRoomTypeImages<T extends Pick<RoomTypeImage, 'id' | 'sortOrder' | 'url'>>(images: readonly T[]): T[] {
  return [...images].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder
    const byUrl = left.url.localeCompare(right.url)
    if (byUrl !== 0) return byUrl
    return left.id.localeCompare(right.id)
  })
}

export function moveImage(ids: readonly string[], imageId: string, direction: -1 | 1): string[] | null {
  const index = ids.indexOf(imageId)
  const next = index + direction
  if (index < 0 || next < 0 || next >= ids.length) return null
  const ordered = [...ids]
  const current = ordered[index]
  const target = ordered[next]
  if (current === undefined || target === undefined) return null
  ordered[index] = target
  ordered[next] = current
  return ordered
}

export function nextImageSortOrder(images: readonly { sortOrder: number }[]) {
  return images.reduce((max, image) => Math.max(max, image.sortOrder), -1) + 1
}

export function makeImageMain(ids: readonly string[], imageId: string): string[] | null {
  const index = ids.indexOf(imageId)
  if (index <= 0) return null
  return [imageId, ...ids.filter((id) => id !== imageId)]
}

export function accommodationErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) return errorMessage(error)
  if (error.status === 403) return 'Недостатньо прав для цієї дії'
  if (error.status === 404) return error.message || 'Запис не знайдено'
  if (error.status === 409) {
    if (error.code === 'ROOM_TYPE_SLUG_EXISTS') return 'Така назва вже використовується'
    if (error.code === 'ROOM_NUMBER_EXISTS') return 'Такий номер уже існує'
    if (error.code === 'ROOM_BLOCK_OVERLAP' || error.code === 'ACTIVE_BOOKING_OVERLAP') {
      return blockConflictMessage(error)
    }
    return error.message
  }
  if (error.details?.length) return error.details.join('. ')
  return error.message || errorMessage(error)
}
