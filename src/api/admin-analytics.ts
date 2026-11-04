import { apiRequest } from '@/lib/api-client'
import { parseAdminAnalyticsSummary, type AdminAnalyticsSummary, type AnalyticsDateType } from '@/lib/analytics-summary'

export async function getAdminAnalyticsSummary(
  query: {
    from: string
    to: string
    dateType: AnalyticsDateType
    categoryIds?: string[]
    roomIds?: string[]
    statuses?: string[]
  },
  signal?: AbortSignal,
): Promise<AdminAnalyticsSummary> {
  const search = new URLSearchParams({ from: query.from, to: query.to, dateType: query.dateType })
  if (query.categoryIds) search.set('categoryIds', query.categoryIds.join(','))
  if (query.roomIds) search.set('roomIds', query.roomIds.join(','))
  if (query.statuses) search.set('statuses', query.statuses.join(','))
  const raw = await apiRequest<unknown>(`/api/admin/analytics/summary?${search.toString()}`, { signal })
  return parseAdminAnalyticsSummary(raw)
}
