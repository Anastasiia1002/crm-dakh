import { apiRequest } from '@/lib/api-client'
import { parseAdminDashboardSummary, type AdminDashboardSummary } from '@/lib/dashboard-summary'

export async function getAdminDashboardSummary(
  query: { from: string; to: string },
  signal?: AbortSignal,
): Promise<AdminDashboardSummary> {
  const search = new URLSearchParams({ from: query.from, to: query.to })
  const raw = await apiRequest<unknown>(`/api/admin/dashboard/summary?${search.toString()}`, { signal })
  return parseAdminDashboardSummary(raw)
}
