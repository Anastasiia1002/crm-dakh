import { apiRequest } from '@/lib/api-client'
import { delay } from '@/mocks/delay'
import * as db from '@/mocks/db'
import type {
  Accommodation,
  AccommodationPage,
  Block,
  RoomBlockCreateInput,
  RoomBlockUpdateInput,
  RoomCreateInput,
  RoomImageCreateInput,
  RoomImageUpdateInput,
  RoomListQuery,
  RoomType,
  RoomTypeCreateInput,
  RoomTypeImage,
  RoomTypeListQuery,
  RoomTypeUpdateInput,
  RoomUpdateInput,
} from '@/types'

function clone<T>(value: T): T {
  return structuredClone(value)
}

function querySuffix(params: Record<string, string | number | boolean | undefined>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue
    search.set(key, String(value))
  }
  const suffix = search.toString()
  return suffix ? `?${suffix}` : ''
}

/** Mock inventory for bookings / calendar / rates until those phases migrate. */
export async function getRoomTypes() {
  await delay()
  return clone(db.roomTypes)
}

export async function getAccommodations() {
  await delay()
  return clone(db.accommodations)
}

export async function getBlocks() {
  await delay()
  return clone(db.blocks)
}

export async function listRoomTypes(query: RoomTypeListQuery = {}): Promise<AccommodationPage<RoomType>> {
  return apiRequest(`/api/admin/accommodations/types${querySuffix({
    page: query.page,
    limit: query.limit,
    search: query.search?.trim() || undefined,
    active: query.active,
  })}`)
}

export async function getRoomType(id: string): Promise<RoomType> {
  return apiRequest(`/api/admin/accommodations/types/${id}`)
}

export async function createRoomType(input: RoomTypeCreateInput): Promise<RoomType> {
  return apiRequest('/api/admin/accommodations/types', {
    method: 'POST',
    body: {
      name: input.name.trim(),
      slug: input.slug.trim().toLowerCase(),
      description: input.description?.trim() ? input.description.trim() : null,
      maxGuests: input.maxGuests,
      active: input.active,
    },
  })
}

export async function updateRoomType(id: string, input: RoomTypeUpdateInput): Promise<RoomType> {
  const body: RoomTypeUpdateInput = {}
  if (input.name !== undefined) body.name = input.name.trim()
  if (input.slug !== undefined) body.slug = input.slug.trim().toLowerCase()
  if (input.description !== undefined) {
    body.description = input.description?.trim() ? input.description.trim() : null
  }
  if (input.maxGuests !== undefined) body.maxGuests = input.maxGuests
  if (input.active !== undefined) body.active = input.active
  return apiRequest(`/api/admin/accommodations/types/${id}`, {
    method: 'PATCH',
    body,
  })
}

export async function listRooms(query: RoomListQuery = {}): Promise<AccommodationPage<Accommodation>> {
  return apiRequest(`/api/admin/accommodations/rooms${querySuffix({
    page: query.page,
    limit: query.limit,
    search: query.search?.trim() || undefined,
    active: query.active,
    roomTypeId: query.roomTypeId,
    status: query.status,
  })}`)
}

export async function getRoom(id: string): Promise<Accommodation> {
  return apiRequest(`/api/admin/accommodations/rooms/${id}`)
}

export async function createRoom(input: RoomCreateInput): Promise<Accommodation> {
  return apiRequest('/api/admin/accommodations/rooms', {
    method: 'POST',
    body: {
      roomTypeId: input.roomTypeId,
      number: input.number.trim(),
      name: input.name?.trim() ? input.name.trim() : null,
      floor: input.floor ?? null,
      status: input.status,
      active: input.active,
    },
  })
}

export async function updateRoom(id: string, input: RoomUpdateInput): Promise<Accommodation> {
  const body: RoomUpdateInput = {}
  if (input.roomTypeId !== undefined) body.roomTypeId = input.roomTypeId
  if (input.number !== undefined) body.number = input.number.trim()
  if (input.name !== undefined) body.name = input.name?.trim() ? input.name.trim() : null
  if (input.floor !== undefined) body.floor = input.floor
  if (input.status !== undefined) body.status = input.status
  if (input.active !== undefined) body.active = input.active
  return apiRequest(`/api/admin/accommodations/rooms/${id}`, {
    method: 'PATCH',
    body,
  })
}

export async function listRoomBlocks(roomId: string): Promise<Block[]> {
  return apiRequest(`/api/admin/accommodations/rooms/${roomId}/blocks`)
}

export async function createRoomBlock(roomId: string, input: RoomBlockCreateInput): Promise<Block> {
  return apiRequest(`/api/admin/accommodations/rooms/${roomId}/blocks`, {
    method: 'POST',
    body: {
      startDate: input.startDate,
      endDate: input.endDate,
      type: input.type,
      reason: input.reason?.trim() ? input.reason.trim() : null,
    },
  })
}

export async function updateRoomBlock(
  roomId: string,
  blockId: string,
  input: RoomBlockUpdateInput,
): Promise<Block> {
  const body: RoomBlockUpdateInput = {}
  if (input.startDate !== undefined) body.startDate = input.startDate
  if (input.endDate !== undefined) body.endDate = input.endDate
  if (input.type !== undefined) body.type = input.type
  if (input.reason !== undefined) body.reason = input.reason?.trim() ? input.reason.trim() : null
  return apiRequest(`/api/admin/accommodations/rooms/${roomId}/blocks/${blockId}`, {
    method: 'PATCH',
    body,
  })
}

export async function deleteRoomBlock(roomId: string, blockId: string) {
  return apiRequest<{ ok: true }>(`/api/admin/accommodations/rooms/${roomId}/blocks/${blockId}`, {
    method: 'DELETE',
  })
}

export async function listRoomTypeImages(roomTypeId: string): Promise<RoomTypeImage[]> {
  return apiRequest(`/api/admin/accommodations/types/${roomTypeId}/images`)
}

export async function createRoomTypeImage(
  roomTypeId: string,
  input: RoomImageCreateInput,
): Promise<RoomTypeImage> {
  return apiRequest(`/api/admin/accommodations/types/${roomTypeId}/images`, {
    method: 'POST',
    body: {
      url: input.url.trim(),
      alt: input.alt?.trim() ? input.alt.trim() : null,
      sortOrder: input.sortOrder,
    },
  })
}

export async function updateRoomTypeImage(
  roomTypeId: string,
  imageId: string,
  input: RoomImageUpdateInput,
): Promise<RoomTypeImage> {
  const body: RoomImageUpdateInput = {}
  if (input.url !== undefined) body.url = input.url.trim()
  if (input.alt !== undefined) body.alt = input.alt?.trim() ? input.alt.trim() : null
  if (input.sortOrder !== undefined) body.sortOrder = input.sortOrder
  return apiRequest(`/api/admin/accommodations/types/${roomTypeId}/images/${imageId}`, {
    method: 'PATCH',
    body,
  })
}

export async function reorderRoomTypeImages(roomTypeId: string, imageIds: string[]): Promise<RoomTypeImage[]> {
  return apiRequest(`/api/admin/accommodations/types/${roomTypeId}/images/reorder`, {
    method: 'PATCH',
    body: { imageIds },
  })
}

export async function deleteRoomTypeImage(roomTypeId: string, imageId: string) {
  return apiRequest<{ ok: true }>(`/api/admin/accommodations/types/${roomTypeId}/images/${imageId}`, {
    method: 'DELETE',
  })
}
