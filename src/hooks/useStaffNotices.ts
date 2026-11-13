import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getStaffNotices, markAllStaffNoticesRead, markStaffNoticeRead } from '@/api/notifications'
import type { StaffNoticeList } from '@/types'

export const STAFF_NOTICE_POLL_MS = 25_000
export const staffNoticeQueryKey = ['staff-notices'] as const

let staffNoticeGeneration = 0
let staffNoticeMutations = 0

export function unreadStaffNotices(list: StaffNoticeList): StaffNoticeList {
  return {
    unreadCount: list.unreadCount,
    items: list.items.filter((item) => item.unread),
  }
}

export function withoutStaffNotice(list: StaffNoticeList, id: string): StaffNoticeList {
  const items = list.items.filter((item) => item.id !== id)
  return {
    unreadCount: items.length === list.items.length ? list.unreadCount : Math.max(0, list.unreadCount - 1),
    items,
  }
}

export function selectStaffNoticeList(
  current: StaffNoticeList | undefined,
  fetched: StaffNoticeList,
  options: { seenGeneration: number; activeGeneration: number; mutations: number },
): StaffNoticeList {
  const unread = unreadStaffNotices(fetched)
  if (options.seenGeneration !== options.activeGeneration || options.mutations > 0) {
    return current ?? unread
  }
  return unread
}

function beginStaffNoticeMutation() {
  staffNoticeMutations += 1
  staffNoticeGeneration += 1
}

function finishStaffNoticeMutation() {
  staffNoticeMutations = Math.max(0, staffNoticeMutations - 1)
  staffNoticeGeneration += 1
}

export function commitStaffNoticeReadAll(queryClient: QueryClient, list: StaffNoticeList) {
  queryClient.setQueryData(staffNoticeQueryKey, unreadStaffNotices(list))
}

export function optimisticStaffNoticeReadAll(queryClient: QueryClient) {
  beginStaffNoticeMutation()
  const previous = queryClient.getQueryData<StaffNoticeList>(staffNoticeQueryKey)
  queryClient.setQueryData<StaffNoticeList>(staffNoticeQueryKey, { unreadCount: 0, items: [] })
  return { previous }
}

export function restoreStaffNoticeList(queryClient: QueryClient, previous: StaffNoticeList | undefined) {
  if (previous) queryClient.setQueryData(staffNoticeQueryKey, previous)
}

export function useStaffNotices() {
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: staffNoticeQueryKey,
    queryFn: async ({ signal }) => {
      const seenGeneration = staffNoticeGeneration
      const list = await getStaffNotices({ signal })
      return selectStaffNoticeList(queryClient.getQueryData(staffNoticeQueryKey), list, {
        seenGeneration,
        activeGeneration: staffNoticeGeneration,
        mutations: staffNoticeMutations,
      })
    },
    staleTime: 10_000,
    refetchInterval: STAFF_NOTICE_POLL_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  })
}

export function useMarkStaffNoticeRead() {
  const queryClient = useQueryClient()
  return useMutation({
    retry: false,
    mutationFn: (id: string) => markStaffNoticeRead(id),
    onMutate: async (id) => {
      beginStaffNoticeMutation()
      await queryClient.cancelQueries({ queryKey: staffNoticeQueryKey })
      const previous = queryClient.getQueryData<StaffNoticeList>(staffNoticeQueryKey)
      if (previous) queryClient.setQueryData(staffNoticeQueryKey, withoutStaffNotice(previous, id))
      return { previous }
    },
    onError: (_error, _id, context) => {
      if (context?.previous) queryClient.setQueryData(staffNoticeQueryKey, context.previous)
    },
    onSuccess: (list, id) => {
      const next = unreadStaffNotices(list)
      queryClient.setQueryData(staffNoticeQueryKey, {
        unreadCount: next.unreadCount,
        items: next.items.filter((item) => item.id !== id),
      })
    },
    onSettled: () => {
      finishStaffNoticeMutation()
    },
  })
}

export function useMarkAllStaffNoticesRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: markAllStaffNoticesRead,
    retry: false,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: staffNoticeQueryKey })
      return optimisticStaffNoticeReadAll(queryClient)
    },
    onError: (_error, _variables, context) => {
      restoreStaffNoticeList(queryClient, context?.previous)
    },
    onSuccess: (list) => {
      commitStaffNoticeReadAll(queryClient, list)
    },
    onSettled: () => {
      finishStaffNoticeMutation()
    },
  })
}
