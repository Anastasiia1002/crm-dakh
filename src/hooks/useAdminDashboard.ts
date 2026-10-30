import { useQuery } from '@tanstack/react-query'
import { getAdminDashboardSummary } from '@/api/admin-dashboard'
import { ADMIN_DASHBOARD_SUMMARY_QUERY_KEY, parseDashboardPeriod } from '@/lib/dashboard-summary'
import { OPERATIONAL_STALE_TIME } from '@/lib/queryClient'

export function useAdminDashboardSummary(from: string, to: string, options?: { enabled?: boolean }) {
  const period = parseDashboardPeriod(from, to)
  return useQuery({
    queryKey: [...ADMIN_DASHBOARD_SUMMARY_QUERY_KEY, from, to],
    queryFn: ({ signal }) => getAdminDashboardSummary({ from, to }, signal),
    enabled: (options?.enabled ?? true) && period.ok,
    retry: false,
    staleTime: OPERATIONAL_STALE_TIME,
  })
}
