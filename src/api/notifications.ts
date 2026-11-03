import { apiRequest } from '@/lib/api-client'
import { ApiError } from '@/lib/api-error'
import type { StaffNoticeList } from '@/types'

const NOTICE_LIMIT = 50
let unreadQuerySupported: boolean | null = null

export async function getStaffNotices(options: { signal?: AbortSignal } = {}) {
  const signal = options.signal
  if (unreadQuerySupported !== false) {
    try {
      const list = await apiRequest<StaffNoticeList>(
        `/api/admin/notifications?limit=${NOTICE_LIMIT}&unread=true`,
        { signal },
      )
      unreadQuerySupported = true
      return list
    } catch (error) {
      if (signal?.aborted || !(error instanceof ApiError) || error.status !== 400) throw error
      unreadQuerySupported = false
    }
  }
  return apiRequest<StaffNoticeList>(`/api/admin/notifications?limit=${NOTICE_LIMIT}`, { signal })
}

export function markStaffNoticeRead(id: string) {
  return apiRequest<StaffNoticeList>(`/api/admin/notifications/${encodeURIComponent(id)}/read`, { method: 'POST' })
}

export function markAllStaffNoticesRead() {
  return apiRequest<StaffNoticeList>('/api/admin/notifications/read-all', { method: 'POST' })
}
