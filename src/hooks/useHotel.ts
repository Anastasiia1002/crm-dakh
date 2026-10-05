import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createBlock,
  deleteBlock,
  deleteRoomType,
  getAccommodations,
  getBlocks,
  getRoomTypes,
  saveAccommodation,
  saveRoomType,
} from '@/api/accommodations'
import { getCalendar } from '@/api/availability'
import { deletePricePeriod, getPricePeriods, getRatePlans, savePricePeriod, saveRatePlan } from '@/api/rates'
import { getServices, saveService, setServiceActive } from '@/api/services'
import { getPromoCodes, savePromoCode, setPromoActive } from '@/api/promoCodes'
import { deletePolicy, getPolicies, getSettings, savePolicy, updateSettings } from '@/api/settings'
import { getAudit, getUsers, saveUser } from '@/api/users'
import type { AccommodationKind } from '@/types'

function useRefresh() {
  const queryClient = useQueryClient()
  return (keys: string[]) => {
    keys.forEach((key) => {
      void queryClient.invalidateQueries({ queryKey: [key] })
    })
    void queryClient.invalidateQueries({ queryKey: ['audit'] })
    void queryClient.invalidateQueries({ queryKey: ['calendar'] })
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }
}

export function useAccommodations() {
  return useQuery({ queryKey: ['accommodations'], queryFn: getAccommodations })
}

export function useRoomTypes() {
  return useQuery({ queryKey: ['room-types'], queryFn: getRoomTypes })
}

export function useBlocks() {
  return useQuery({ queryKey: ['blocks'], queryFn: getBlocks })
}

export function useSaveAccommodation() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: saveAccommodation,
    onSuccess: () => refresh(['accommodations']),
  })
}

export function useSaveRoomType() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: saveRoomType,
    onSuccess: () => refresh(['room-types']),
  })
}

export function useDeleteRoomType() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: deleteRoomType,
    onSuccess: () => refresh(['room-types']),
  })
}

export function useCreateBlock() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: createBlock,
    onSuccess: () => refresh(['blocks']),
  })
}

export function useDeleteBlock() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: deleteBlock,
    onSuccess: () => refresh(['blocks']),
  })
}

export function useCalendar(from: string, days: number, kind: AccommodationKind | 'all') {
  return useQuery({
    queryKey: ['calendar', from, days, kind],
    queryFn: () => getCalendar(from, days, kind),
  })
}

export function useRatePlans() {
  return useQuery({ queryKey: ['rate-plans'], queryFn: getRatePlans })
}

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
  return useQuery({ queryKey: ['promo-codes'], queryFn: getPromoCodes })
}

export function useSavePromo() {
  const refresh = useRefresh()
  return useMutation({ mutationFn: savePromoCode, onSuccess: () => refresh(['promo-codes']) })
}

export function useTogglePromo() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => setPromoActive(id, active),
    onSuccess: () => refresh(['promo-codes']),
  })
}

export function useSettings() {
  return useQuery({ queryKey: ['settings'], queryFn: getSettings })
}

export function useUpdateSettings() {
  const refresh = useRefresh()
  return useMutation({ mutationFn: updateSettings, onSuccess: () => refresh(['settings']) })
}

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

export function useUsers() {
  return useQuery({ queryKey: ['users'], queryFn: getUsers })
}

export function useAudit() {
  return useQuery({ queryKey: ['audit'], queryFn: getAudit })
}

export function useSaveUser() {
  const queryClient = useQueryClient()
  const refresh = useRefresh()
  return useMutation({
    mutationFn: saveUser,
    onSuccess: (user) => {
      refresh(['users'])
      const session = queryClient.getQueryData<{ id: string } | null>(['session'])
      if (session?.id === user.id) queryClient.setQueryData(['session'], user)
    },
  })
}
