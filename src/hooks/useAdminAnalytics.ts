import { useQuery } from '@tanstack/react-query'
import { getAdminAnalyticsSummary } from '@/api/admin-analytics'
import {
  ADMIN_ANALYTICS_SUMMARY_QUERY_KEY,
  analyticsPeriodReady,
  toAnalyticsQuery,
  type AnalyticsFilterState,
} from '@/lib/analytics-summary'
import { OPERATIONAL_STALE_TIME } from '@/lib/queryClient'

export function useAdminAnalyticsSummary(filters: AnalyticsFilterState, options?: { enabled?: boolean }) {
  const period = analyticsPeriodReady(filters.from, filters.to)
  const query = toAnalyticsQuery(filters)
  return useQuery({
    queryKey: [...ADMIN_ANALYTICS_SUMMARY_QUERY_KEY, query],
    queryFn: ({ signal }) => getAdminAnalyticsSummary(query, signal),
    enabled: (options?.enabled ?? true) && period.ok,
    retry: false,
    staleTime: OPERATIONAL_STALE_TIME,
  })
}
