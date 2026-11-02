import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getStaffNotices, markAllStaffNoticesRead, markStaffNoticeRead } from '@/api/notifications'

export const STAFF_NOTICE_POLL_MS = 25_000
export const staffNoticeQueryKey = ['staff-notices'] as const

export function useStaffNotices() {
  return useQuery({
    queryKey: staffNoticeQueryKey,
    queryFn: () => getStaffNotices(),
    staleTime: 0,
    refetchInterval: STAFF_NOTICE_POLL_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  })
}

export function useMarkStaffNoticeRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: markStaffNoticeRead,
    onSuccess: (list) => {
      queryClient.setQueryData(staffNoticeQueryKey, list)
    },
  })
}

export function useMarkAllStaffNoticesRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: markAllStaffNoticesRead,
    onSuccess: (list) => {
      queryClient.setQueryData(staffNoticeQueryKey, list)
    },
  })
}
