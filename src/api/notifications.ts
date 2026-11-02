import { apiRequest } from '@/lib/api-client'
import type { StaffNoticeList } from '@/types'

export function getStaffNotices(limit = 20) {
  return apiRequest<StaffNoticeList>(`/api/admin/notifications?limit=${limit}`)
}

export function markStaffNoticeRead(id: string) {
  return apiRequest<StaffNoticeList>(`/api/admin/notifications/${encodeURIComponent(id)}/read`, { method: 'POST' })
}

export function markAllStaffNoticesRead() {
  return apiRequest<StaffNoticeList>('/api/admin/notifications/read-all', { method: 'POST' })
}
