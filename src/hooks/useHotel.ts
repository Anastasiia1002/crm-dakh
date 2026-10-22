import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { CATALOG_STALE_TIME } from '@/lib/queryClient'
import {
  createRoom,
  createRoomBlock,
  createRoomType,
  createRoomTypeImage,
  deleteRoomBlock,
  deleteRoomTypeImage,
  getAccommodations,
  getBlocks,
  getRoomType,
  getRoomTypes,
  listRoomBlocks,
  listRooms,
  listRoomTypeImages,
  listRoomTypes,
  reorderRoomTypeImages,
  updateRoom,
  updateRoomBlock,
  updateRoomType,
  updateRoomTypeImage,
} from '@/api/accommodations'
import { getCalendar } from '@/api/availability'
import {
  createCancellationPolicy,
  createDayPriceRule,
  createLengthStayDiscount,
  createRatePlan,
  createRoomPrice,
  deleteDayPriceRule,
  deleteLengthStayDiscount,
  deletePricePeriod,
  deleteRoomPrice,
  getCancellationPolicy,
  getPricePeriods,
  getRatePlan,
  getRatePlans,
  getRoomPrice,
  listCancellationPolicies,
  listDayPriceRules,
  listLengthStayDiscounts,
  listRatePlans,
  listRoomPrices,
  previewDayPrice,
  previewLengthStay,
  savePricePeriod,
  saveRatePlan,
  updateCancellationPolicy,
  updateDayPriceRule,
  updateLengthStayDiscount,
  updateRatePlan,
  updateRoomPrice,
} from '@/api/rates'
import { getServices, saveService, setServiceActive } from '@/api/services'
import {
  createAdminPromoCode,
  deleteAdminPromoCode,
  listAdminPromoCodes,
  updateAdminPromoCode,
  type AdminPromoWrite,
} from '@/api/promoCodes'
import {
  deletePolicy,
  getHotelBookingSettings,
  getHotelSettings,
  getPolicies,
  getSettings,
  savePolicy,
  updateHotelBookingSettings,
  updateHotelSettings,
  updateSettings,
} from '@/api/settings'
import {
  changeAdminPassword,
  createAdminUser,
  getAudit,
  listAdminUsers,
  revokeAdminSessions,
  updateAdminUser,
} from '@/api/users'
import type {
  AccommodationKind,
  AdminUserListQuery,
  CancellationPolicyListQuery,
  HotelBookingSettings,
  HotelSettings,
  RatePlanListQuery,
  RoomListQuery,
  RoomPriceListQuery,
  RoomTypeListQuery,
} from '@/types'

function useRefresh() {
  const queryClient = useQueryClient()
  return (keys: string[]) => {
    keys.forEach((key) => {
      void queryClient.invalidateQueries({ queryKey: [key] })
    })
    void queryClient.invalidateQueries({ queryKey: ['audit'] })
    void queryClient.invalidateQueries({ queryKey: ['calendar'] })
    void queryClient.invalidateQueries({ queryKey: ['admin-calendar'] })
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }
}

/** Mock inventory for bookings / calendar / rates until those modules migrate. */
export function useAccommodations() {
  return useQuery({ queryKey: ['accommodations'], queryFn: getAccommodations })
}

export function useRoomTypes() {
  return useQuery({ queryKey: ['room-types'], queryFn: getRoomTypes })
}

export function useBlocks() {
  return useQuery({ queryKey: ['blocks'], queryFn: getBlocks })
}

export function useAdminRoomTypes(query: RoomTypeListQuery = {}) {
  return useQuery({
    queryKey: ['admin-room-types', query],
    queryFn: () => listRoomTypes(query),
    staleTime: CATALOG_STALE_TIME,
  })
}

export function useAdminRoomType(id: string | undefined) {
  return useQuery({
    queryKey: ['admin-room-type', id],
    queryFn: ({ signal }) => getRoomType(id!, signal),
    enabled: Boolean(id),
    staleTime: CATALOG_STALE_TIME,
  })
}

export function useAdminRooms(query: RoomListQuery = {}, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['admin-rooms', query],
    queryFn: ({ signal }) => listRooms(query, signal),
    enabled: options?.enabled ?? true,
    staleTime: CATALOG_STALE_TIME,
  })
}

export function useAdminRoomBlocks(roomIds: string[]) {
  return useQueries({
    queries: roomIds.map((roomId) => ({
      queryKey: ['admin-room-blocks', roomId],
      queryFn: ({ signal }) => listRoomBlocks(roomId, signal),
      enabled: Boolean(roomId),
      staleTime: CATALOG_STALE_TIME,
    })),
  })
}

export function useAdminRoomTypeImages(roomTypeId: string | undefined) {
  return useQuery({
    queryKey: ['admin-room-type-images', roomTypeId],
    queryFn: () => listRoomTypeImages(roomTypeId!),
    enabled: Boolean(roomTypeId),
  })
}

export function useCreateAdminRoomType() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: createRoomType,
    // Rooms inherit kind from RoomType; keep filtered room lists in sync.
    onSuccess: () => refresh(['admin-room-types', 'admin-room-type', 'admin-rooms']),
  })
}

export function useUpdateAdminRoomType() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateRoomType>[1] }) =>
      updateRoomType(id, input),
    // Kind changes move units between ROOM/COTTAGE inventory queries.
    onSuccess: () =>
      refresh(['admin-room-types', 'admin-room-type', 'admin-room-type-images', 'admin-rooms']),
  })
}

export function useCreateAdminRoom() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: createRoom,
    onSuccess: () => refresh(['admin-rooms']),
  })
}

export function useUpdateAdminRoom() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateRoom>[1] }) => updateRoom(id, input),
    onSuccess: () => refresh(['admin-rooms']),
  })
}

export function useCreateAdminRoomBlock() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: ({ roomId, input }: { roomId: string; input: Parameters<typeof createRoomBlock>[1] }) =>
      createRoomBlock(roomId, input),
    onSuccess: () => refresh(['admin-room-blocks', 'admin-rooms']),
  })
}

export function useUpdateAdminRoomBlock() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: ({
      roomId,
      blockId,
      input,
    }: {
      roomId: string
      blockId: string
      input: Parameters<typeof updateRoomBlock>[2]
    }) => updateRoomBlock(roomId, blockId, input),
    onSuccess: () => refresh(['admin-room-blocks', 'admin-rooms']),
  })
}

export function useDeleteAdminRoomBlock() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: ({ roomId, blockId }: { roomId: string; blockId: string }) => deleteRoomBlock(roomId, blockId),
    onSuccess: () => refresh(['admin-room-blocks', 'admin-rooms']),
  })
}

export function useCreateAdminRoomTypeImage() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: ({
      roomTypeId,
      input,
    }: {
      roomTypeId: string
      input: Parameters<typeof createRoomTypeImage>[1]
    }) => createRoomTypeImage(roomTypeId, input),
    onSuccess: () => refresh(['admin-room-type-images']),
  })
}

export function useUpdateAdminRoomTypeImage() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: ({
      roomTypeId,
      imageId,
      input,
    }: {
      roomTypeId: string
      imageId: string
      input: Parameters<typeof updateRoomTypeImage>[2]
    }) => updateRoomTypeImage(roomTypeId, imageId, input),
    onSuccess: () => refresh(['admin-room-type-images']),
  })
}

export function useReorderAdminRoomTypeImages() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: ({ roomTypeId, imageIds }: { roomTypeId: string; imageIds: string[] }) =>
      reorderRoomTypeImages(roomTypeId, imageIds),
    onSuccess: () => refresh(['admin-room-type-images']),
  })
}

export function useDeleteAdminRoomTypeImage() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: ({ roomTypeId, imageId }: { roomTypeId: string; imageId: string }) =>
      deleteRoomTypeImage(roomTypeId, imageId),
    onSuccess: () => refresh(['admin-room-type-images']),
  })
}

export function useCalendar(from: string, days: number, kind: AccommodationKind | 'all') {
  return useQuery({
    queryKey: ['calendar', from, days, kind],
    queryFn: () => getCalendar(from, days, kind),
  })
}

/** Mock rate plans for bookings until booking rates migrate. */
export function useRatePlans() {
  return useQuery({ queryKey: ['rate-plans'], queryFn: getRatePlans })
}

/** Mock seasonal prices for bookings. */
export function usePricePeriods() {
  return useQuery({ queryKey: ['prices'], queryFn: getPricePeriods })
}

export function useSaveRatePlan() {
  const refresh = useRefresh()
  return useMutation({ mutationFn: saveRatePlan, onSuccess: () => refresh(['rate-plans']) })
}

export function useSavePricePeriod() {
  const refresh = useRefresh()
  return useMutation({ mutationFn: savePricePeriod, onSuccess: () => refresh(['prices']) })
}

export function useDeletePricePeriod() {
  const refresh = useRefresh()
  return useMutation({ mutationFn: deletePricePeriod, onSuccess: () => refresh(['prices']) })
}

export function useAdminRatePlans(query: RatePlanListQuery = {}) {
  return useQuery({
    queryKey: ['admin-rate-plans', query],
    queryFn: ({ signal }) => listRatePlans(query, signal),
    staleTime: CATALOG_STALE_TIME,
  })
}

export function useAdminRatePlan(id: string | undefined) {
  return useQuery({
    queryKey: ['admin-rate-plan', id],
    queryFn: () => getRatePlan(id!),
    enabled: Boolean(id),
  })
}

export function useCreateAdminRatePlan() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: createRatePlan,
    onSuccess: () => refresh(['admin-rate-plans', 'admin-rate-plan']),
  })
}

export function useUpdateAdminRatePlan() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateRatePlan>[1] }) =>
      updateRatePlan(id, input),
    onSuccess: () => refresh(['admin-rate-plans', 'admin-rate-plan']),
  })
}

export function useAdminCancellationPolicies(query: CancellationPolicyListQuery = {}) {
  return useQuery({
    queryKey: ['admin-cancellation-policies', query],
    queryFn: () => listCancellationPolicies(query),
  })
}

export function useAdminCancellationPolicy(id: string | undefined) {
  return useQuery({
    queryKey: ['admin-cancellation-policy', id],
    queryFn: () => getCancellationPolicy(id!),
    enabled: Boolean(id),
  })
}

export function useCreateAdminCancellationPolicy() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: createCancellationPolicy,
    onSuccess: () => refresh(['admin-cancellation-policies', 'admin-cancellation-policy', 'admin-rate-plans']),
  })
}

export function useUpdateAdminCancellationPolicy() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateCancellationPolicy>[1] }) =>
      updateCancellationPolicy(id, input),
    onSuccess: () => refresh(['admin-cancellation-policies', 'admin-cancellation-policy', 'admin-rate-plans']),
  })
}

export function useAdminRoomPrices(query: RoomPriceListQuery = {}) {
  return useQuery({
    queryKey: ['admin-room-prices', query],
    queryFn: () => listRoomPrices(query),
  })
}

export function useAdminRoomPrice(id: string | undefined) {
  return useQuery({
    queryKey: ['admin-room-price', id],
    queryFn: () => getRoomPrice(id!),
    enabled: Boolean(id),
  })
}

export function useCreateAdminRoomPrice() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: createRoomPrice,
    onSuccess: () => refresh(['admin-room-prices', 'admin-room-price']),
  })
}

export function useUpdateAdminRoomPrice() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateRoomPrice>[1] }) =>
      updateRoomPrice(id, input),
    onSuccess: () => refresh(['admin-room-prices', 'admin-room-price']),
  })
}

export function useDeleteAdminRoomPrice() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: deleteRoomPrice,
    onSuccess: () => refresh(['admin-room-prices', 'admin-room-price']),
  })
}

export function useAdminDayPriceRules(query: import('@/types').DayPriceRuleListQuery = {}) {
  return useQuery({
    queryKey: ['admin-day-price-rules', query],
    queryFn: () => listDayPriceRules(query),
  })
}

export function useCreateAdminDayPriceRule() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: createDayPriceRule,
    onSuccess: () => refresh(['admin-day-price-rules']),
  })
}

export function useUpdateAdminDayPriceRule() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateDayPriceRule>[1] }) =>
      updateDayPriceRule(id, input),
    onSuccess: () => refresh(['admin-day-price-rules']),
  })
}

export function useDeleteAdminDayPriceRule() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: deleteDayPriceRule,
    onSuccess: () => refresh(['admin-day-price-rules']),
  })
}

export function usePreviewAdminDayPrice() {
  return useMutation({ mutationFn: previewDayPrice })
}

export function useAdminLengthStayDiscounts(query: import('@/types').LengthStayDiscountListQuery = {}) {
  return useQuery({
    queryKey: ['admin-length-stay-discounts', query],
    queryFn: () => listLengthStayDiscounts(query),
  })
}

export function useCreateAdminLengthStayDiscount() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: createLengthStayDiscount,
    onSuccess: () => refresh(['admin-length-stay-discounts']),
  })
}

export function useUpdateAdminLengthStayDiscount() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateLengthStayDiscount>[1] }) =>
      updateLengthStayDiscount(id, input),
    onSuccess: () => refresh(['admin-length-stay-discounts']),
  })
}

export function useDeleteAdminLengthStayDiscount() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: deleteLengthStayDiscount,
    onSuccess: () => refresh(['admin-length-stay-discounts']),
  })
}

export function usePreviewAdminLengthStay() {
  return useMutation({ mutationFn: previewLengthStay })
}

export function useServices() {
  return useQuery({ queryKey: ['services'], queryFn: getServices })
}

export function useSaveService() {
  const refresh = useRefresh()
  return useMutation({ mutationFn: saveService, onSuccess: () => refresh(['services']) })
}

export function useToggleService() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => setServiceActive(id, active),
    onSuccess: () => refresh(['services']),
  })
}

export function usePromoCodes() {
  return useQuery({ queryKey: ['promo-codes'], queryFn: () => listAdminPromoCodes() })
}

export function useSavePromo() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: AdminPromoWrite }) =>
      id ? updateAdminPromoCode(id, input) : createAdminPromoCode(input),
    onSuccess: () => refresh(['promo-codes']),
  })
}

export function useTogglePromo() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => updateAdminPromoCode(id, { active }),
    onSuccess: () => refresh(['promo-codes']),
  })
}

export function useDeletePromo() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: (id: string) => deleteAdminPromoCode(id),
    onSuccess: () => refresh(['promo-codes']),
  })
}

export function useHotelSettings() {
  return useQuery({ queryKey: ['hotel-settings'], queryFn: getHotelSettings, staleTime: CATALOG_STALE_TIME })
}

export function useUpdateHotelSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateHotelSettings,
    onSuccess: (hotel: HotelSettings) => {
      queryClient.setQueryData(['hotel-settings'], hotel)
    },
  })
}

export function useHotelBookingSettings() {
  return useQuery({
    queryKey: ['hotel-booking-settings'],
    queryFn: getHotelBookingSettings,
    staleTime: CATALOG_STALE_TIME,
  })
}

export function useUpdateHotelBookingSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateHotelBookingSettings,
    onSuccess: (settings: HotelBookingSettings) => {
      queryClient.setQueryData(['hotel-booking-settings'], settings)
    },
  })
}

export function useSettings() {
  return useQuery({ queryKey: ['settings'], queryFn: getSettings })
}

export function useUpdateSettings() {
  const refresh = useRefresh()
  return useMutation({ mutationFn: updateSettings, onSuccess: () => refresh(['settings']) })
}

/** Mock booking policies (refund ladder). Admin Settings/Rates use admin-cancellation-policies. */
export function usePolicies() {
  return useQuery({ queryKey: ['policies'], queryFn: getPolicies })
}

export function useSavePolicy() {
  const refresh = useRefresh()
  return useMutation({ mutationFn: savePolicy, onSuccess: () => refresh(['policies']) })
}

export function useDeletePolicy() {
  const refresh = useRefresh()
  return useMutation({ mutationFn: deletePolicy, onSuccess: () => refresh(['policies']) })
}

export function useUsers(query: AdminUserListQuery = {}) {
  return useQuery({
    queryKey: ['users', query],
    queryFn: () => listAdminUsers(query),
  })
}

export function useAudit() {
  return useQuery({ queryKey: ['audit'], queryFn: getAudit })
}

export function useCreateAdminUser() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: createAdminUser,
    onSuccess: () => refresh(['users']),
  })
}

export function useUpdateAdminUser() {
  const queryClient = useQueryClient()
  const refresh = useRefresh()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateAdminUser>[1] }) =>
      updateAdminUser(id, input),
    onSuccess: (user) => {
      refresh(['users'])
      const session = queryClient.getQueryData<{ id: string } | null>(['session'])
      if (session?.id === user.id) {
        queryClient.setQueryData(['session'], {
          ...session,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          active: user.active,
        })
      }
    },
  })
}

export function useChangeAdminPassword() {
  return useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) => changeAdminPassword(id, password),
  })
}

export function useRevokeAdminSessions() {
  return useMutation({
    mutationFn: (id: string) => revokeAdminSessions(id),
  })
}
